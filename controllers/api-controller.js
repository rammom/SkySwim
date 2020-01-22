const Post = require('../models/post-model');
const User = require('../models/user-model');
const Follow = require('../models/follow-model');
const Feed = require('../models/feed-model');
const Errors = require('../services/Errors');
const s3 = require('../services/s3-setup');
const safe = require('safe-regex');

const help = {
  invalidateFeed: async userId => {
    let error = null;

  	await Feed.findOneAndDelete({user: userId})
  		.catch(error_ => {
        error = error_;
      });

    return error;
  }
}

/*
  Get an AWS.S3 presigned PUT url, allowing you to upload directly to the s3 bucket
*/
exports.askAWSForPresignedPutUrl = async (req, res, next) => {
  let error = null;
	const contentType = req.query.contentType.toLowerCase();

	// Validate the request
	if (!contentType || !(contentType.startsWith("image/") || contentType.startsWith("video/"))) {
    return next(new Errors.ValidationError("invalid request"));
  }

  // Example: 4172890743.jpeg
  const fileName = `${Date.now().toString()}.${contentType.split('/').pop()}`;

  // Ask for presigned URL
	let signedUrl = await s3.getSignedUrl(fileName, contentType)
		.catch(error_ => {
      error = error_;
    });

	if (error) {
		return next(error);
  }

	res.status(200).json({
		signedUrl,
		fileName,
    bucketName: process.env.SS_AWS_BUCKET
	})
};

/*
  Get list of 10 users based on matching search terms
*/
exports.getUsersFromSearchTerm = async (req, res, next) => {
	let error = null;
  const text = req.query.text;

	// Validate the request and check for malicious code
	if (!text || !safe(text)) {
		return next(new Errors.ValidationError('invalid request'));
  }

  // slow
  // TODO: Figure out if making this faster is possible
	let users = await User.find({username: { $regex: "^"+text, $options: 'i'}})
		.select('_id username picture')
		.limit(10)
		.catch(error_ => {
      error = error_;
    });

	if (error) {
		return next(error);
  }

	res.status(200).json({users});
};

/*
  Get page of user's posts (fan out on read is slow, ideally this won't happen much)
*/
exports.getUserPostsPaginated = async (req, res, next) => {
  let error = null;
	let {page} = req.query;
	const user = req.query.user;

	// Validate the request, making 'page' an integer in the process
	if (!user || !page || isNaN(page) || !(page = parseInt(page)) || page < 1) {
    return next(new Errors.ValidationError('invalid request'));
  }

  const pageSize = parseInt(process.env.SS_FEED_CACHE_LIMIT);
  const offsetToPage = pageSize * (page - 1);

	// Find recent posts from user profile
	let posts = await Post.find({ "user.id": user })
		.sort({created: -1})
		.skip(offsetToPage)
		.limit(pageSize)
		.catch(error_ => {
      error = error_;
    });

	if (error) {
		return next(error);
  }

	return res.status(200).json({posts});
};

/*
  Get page of user's Feed
*/
exports.getUserFeedPaginated = async (req, res, next) => {
  let error = null;
  let posts = null;
	let {page} = req.query;

	// Validate the request, making 'page' an integer in the process
  if (!page || isNaN(page) || !(page = parseInt(page)) || page < 1) {
	   return next(Errors.ValidationError('invalid request'));
  }

	if (page == 1) {
    // Look for a cached feed
		let feed = await Feed.findOne({user: req.user._id})
			.populate('posts')
			.catch(error_ => {
        error_ = error;
      });

		if (error) {
			return next(error);
    }

		// check length of user feed, if it is very short, invalidate it
		// probably would need to better optimize this
		if (feed && feed.posts.length  < process.env.SS_FEED_CACHE_LIMIT / 3) {
			await feed.remove()
				.catch(e => error = e);

			// don't throw the error here in order to complete request
			if (error)
				console.log(error);

			feed = null;
		};

		if (feed) {
      if (feed.posts.length < process.env.SS_FEED_CACHE_LIMIT / 3) {
        // Feed is too short, invalidate it
        await feed.remove()
          .catch(error_ => {
            error = error_;
          })

        if (error) {
          // TODO: Add failed task to job queue
          console.error(`FAILED TO INVALIDATE FEED! ${error}`);
        }
      }

			posts = feed.posts;
		}

	}

  if (!posts) {
    // Build new Feed: Fan out read all following users posts

    // Find people the user is following
    let followers = await Follow.find({follower: req.user})
      .catch(error_ => {
        error = error_;
      });

    if (error) {
      return next(error);
    }

    // Map to user ids and add user's id
    followers = followers.map(follower => follower.user);
    followers.push(req.user._id);

    const pageSize = parseInt(process.env.SS_FEED_CACHE_LIMIT);
    const offsetToPage = pageSize * (page - 1);

    // Find corresponding posts
    posts = await Post.find({"user.id": {$in: followers}})
      .sort({ created: -1 })
      .skip(offsetToPage)
      .limit(pageSize)
      .catch(error_ => {
        error = error_;
      });

    if (error) {
      return next(error);
    }

    if (page == 1) {
      // Cache newly create user Feed
      await new Feed({
        user: req.user._id,
        posts
      }).save()
      .catch(error_ => {
        error = error_;
      });

      if (error) {
        return next(error);
      }
    }
  }

	return res.status(200).json({posts});
};

/*
  Creates a new post and propagates it to Feeds
*/
exports.createPost = async (req, res, next) => {
  let error = null;
	const {type, blurb, media} = req.body;

	// Validate the request body
	if (!blurb || !['blurb', 'image', 'video'].includes(type) || (type != 'blurb' && media == null)) {
      return next(new Errors.ValidationError('invalid request'))
  }

	// Create new post
	let post = await new Post({
		type,
		blurb,
		media,
		user: {
			id: req.user._id,
			username: req.user.username,
			picture: req.user.picture
		}
	}).save()
		.catch(error_ => {
      error = error_;
    });

	if (error) {
		return next(error);
  }

	let pageSize = parseInt(process.env.SS_FEED_CACHE_LIMIT)

	// Add to current user's feed
	await Feed.findOneAndUpdate({user: req.user._id}, {$push: {posts: {$each: [post], $position: 0, $slice: pageSize}}})
    .catch(error_ => {
      // TODO: Add failing task to job queue
      console.error(`FAILED TO ADD NEW POST TO USER FEED: ${error_}`);
    });

	// Fan out to followers with cached feeds, don't await to not block
	Follow.find({user: req.user._id})
		.then(follows => {
			// Send out update for each follower
			follows.forEach(relation => {
				Feed.findOneAndUpdate({user: relation.follower}, {$push: {posts: {$each: [post], $position: 0, $slice: pageSize}}})
          .catch(error_ => {
            // TODO: Add failing task to job queue
            console.error(`FAILED TO ADD NEW POST TO FOLLOWERS FEED: ${error_}`);
          });
			})
		});

	return res.status(200).json(post);
}

/*
  Remove a post and propagate update to Feeds
*/
exports.deletePost = async (req, res, next) => {
  let error = null;
	const {postId} = req.body;

	// validate request body
	if (!postId) {
		return next(new Errors.ValidationError('invalid request'))
  }

	// check post belongs to user
	let post = await Post.findOne({_id: postId, "user.id": req.user._id})
		.catch(error_ => {
      error = error_;
    });

	if (error) {
		return next(error);
  }

	if (!post) {
		return next(new Errors.ValidationError('invalid request'))
  }

	if (post.media) {
		const fileName = post.media.split('/').pop();

    // Delete media
		await s3.deleteObject(fileName)
			.catch(error_ => {
        // TODO: Add failed task to job queue
        console.error(`FAILED TO REMOVE OBJECT FROM S3 (${fileName}): ${error}`);
      });
	}

	await post.remove()
		.catch(error_ => {
      error = error_;
    });

	if (error) {
		return next(error);
  }

	// update user's feed
	Feed.findOneAndUpdate({user: req.user._id}, {$pull: {posts: postId}})
    .catch(error_ => {
      // TODO: Add failing task to job queue
      console.error(`FAILED TO DELETE POST FROM USER FEED: ${error_}`);
    });

	// fan out to followers with cached feeds, don't await to not block
	Follow.find({ user: req.user._id })
		.then(follows => {
			// Send out update for each follower
			follows.forEach(relation => {
				Feed.findOneAndUpdate({user: relation.follower}, {$pull: {posts: postId}})
          .catch(error_ => {
            // TODO: Add failing task to job queue
            console.error(`FAILED TO DELETE POST FROM FOLLOWERS FEED: ${error_}`);
          });
			})
		});

	return res.status(200).json({});
};

/*
  Delete a Feed
*/
exports.invalidateFeed = async (req, res, next) => {
	let error = await help.invalidateFeed(req.user._id);
	return res.status(200).json({});
};

/*
  Follow a target user, update current user's feed
*/
exports.followUser = async (req, res, next) => {
  let error = null;
	const {user} = req.body;
	const follower = req.user._id;

	// validate request
	if (!user) {
		return Errors.ValidationError('invalid request');
  }

	// Check if relationship already exists
	let follow = await Follow.findOne({user, follower})
		.catch(error_ => {
      error = error_;
    });

  if (error) {
    return next(error);
  }

	if (follow) {
    // Current user is already following the target user
    return next(Errors.ValidationError('invalid request'));
  }

	// Create a follow relationship
	follow = await new Follow({user, follower}).save()
		.catch(error => {
      error = error_
    });

	if (error) {
    return next(error);
  }

	// Invalidate user feed
  error = await help.invalidateFeed(req.user._id);

	if (error) {
		return next(error);
  }

	return res.status(200).json(follow);
};

/*
  Unfollow a target user, update current user's feed
*/
exports.unfollowUser = async (req, res, next) => {
  let error = null;
	const {user} = req.body;
	const follower = req.user._id;

	// validate request
	if (!user) {
		return Errors.ValidationError('invalid request');
  }

	// delete relationship
	await Follow.findOneAndDelete({user, follower})
		.catch(error_ => {
      error = error_;
    });

	if (error) {
    return next(error);
  }

  // Invalidate user feed
  error = await help.invalidateFeed(req.user._id);

	if (error) {
		return next(error);
  }

	return res.status(200).json({});
};
