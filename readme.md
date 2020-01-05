![Banner image](./readme-images/skyswim-banner.png)

# SkySwim Social

Utilized conventional software engineering methodologies in order to mimic a modern day social media web app. 
Keep reading for more on what my thought process was while architecting the application and what kind of optimization techniques were used.

Try it out by visiting [the demo hosted on my portfolio](https://skyswim.mrammo.ca/), or watch [this YouTube video](https://www.youtube.com/watch?v=AaeUz1e_dBk) of me quickly overviewing it's functionality.

View my medium article concerning SkySwim [here](https://medium.com/@mrammo/how-i-built-a-modern-day-social-media-application-with-node-js-part-1-120c11e9a97b?sk=3591d8b3db54f54de7a1704c2ef7c73b)

## On Building SkySwim
_On Building SkySwim is still a work in progress, but here is what I have so far._

* [Thinking about the database](#thinking-about-the-database)
* [Next up, Newsfeed](#next-up,-newsfeed)

Before building this app I knew that the primary goal was to refine and put together everything I've learned about Node.js and general app development over the last year. As much as I'd love it to, I don't expect SkySwim to have a large active user base; nevertheless, I still wanted to go about development as if it would.

### Thinking about the database
_First problem: SQL or NoSQL?_ After a good deal of research, I've chosen to go with MongoDB, a NoSQL document based database. MongoDB, being a NoSQL database, offers multiple advantages including its ability to [scale horizontally](https://github.com/vaquarkhan/vaquarkhan/wiki/Difference-between-scaling-horizontally-and-vertically) by [sharding](https://docs.mongodb.com/manual/sharding/) it's data, which would prove useful in social media type applications because of their intrinsic need to quickly scale. On top of this, the json-like structure of it's data mixes well with Node.js.

Moving on, how should the data be structured? Naturally there would need to be a collection of Users and Posts, a user would log into their account (via google or facebook) to make a post which would be stored with a reference to the user. Here's how this looks: 

```javascript
const userSchema = new Schema({
	username: String,
	picture: { type: String, default: "https://domain.com/some-pic.png" },
	googleId: String,
	facebookId: String
});
userSchema.index({ username: 1 });
userSchema.index({ googleId: 1 });
userSchema.index({ facebookId: 1 });
```

```javascript
const postSchema = new Schema({
	type: { type: String, enum: ['blurb', 'image', 'video'] },
	blurb: { type: String, required: true },
	media: String,
	user: {
		id: { type: ObjectId, ref: 'user', required: true },
		username: String,
		picture: String
	},
	created: { type: Date }
});
postSchema.index({ "user.id": 1, created: -1 });
postSchema.index({ _id: 1, "user.id": 1 });
```

_Side note: You may be wondering why I'm storing the user as an embedded document in post. This is because on the frontend I display the user's name and picture along with the post. When gathering posts to be displayed I don't want to have to fetch the user object with each post, that would just take more time._

Okay, so now with this a user can make a post. But just making posts isn't very social; users need to be able to follow each other! My intuitive thought on how to tackle follows was to add more fields to the user schema called `following` and `followers` being lists of user ids. This would work fine, until it doesn't. Since I'm building SkySwim as if it were going to be the new [Twitter](https://twitter.com), I have to think of scalability as if I were Twitter. At the moment [Justin Beiber](https://twitter.com/justinbieber) has over 107 million followers on Twitter, if Twitter kept their data as described above, Justin's user object would need to store 107 million user ids. A MongoDB ObjectId type (which is what we would be using to reference users) is 12 bytes long, lets do the math: `(107 million ids) * (12 bytes per id) = 1284 million bytes = 1.284 gigabytes`. Twitter would have to retrieve more than 1.284 gigabytes of data every time they get Justin's user from the database. They've either got some crazy hardware, or there's a better way.

After some research, it turns out there is a better way. We keep a relationship style `Follow` collection, turbocharged by [MongoDB Indexes](https://docs.mongodb.com/manual/indexes/):
```javascript
const followSchema = new Schema({
	user: { type: ObjectId, ref: 'user', required: true },
	follower: { type: ObjectId, ref: 'user', required: true }
});
followSchema.index({ user: 1, follower: 1});
followSchema.index({ follower: 1, user: 1 });
```
With this technique, cherry picked from SQL development, the user doesn't need to keep track of who it's following or vice versa. This works so well because of the indexes placed on the schema, by keeping an index on both `user` and `follower` we can run a MongoDB query to find all of a user's followers or followees (through a collection of 21 million documents!) in less than 1ms.
```javascript
// find user's followers
db.follow.find({"user": "5e0bbf9ea11f6b54d68b70e9"});
// find user's followees
db.follow.find({"follower": "5e0bbf9ea11f6b54d68b70e9"});
```

_Note: The users posts are also referenced in a similar fashion_

SkySwim uses one more collection, it'll be introduced in the next section.


### Next up, Newsfeed

In all honesty, this part of planning was the most intimidating. How do modern day social media applications build a user's newsfeed so efficiently? I've decided to take up this challenge. Modern day Twitter and Instagram use a mix of what is called ranked and chronological feeds. Ranked feeds having a post order that is based on user preferences and chronological feeds being solely time based. Due to lack of user data, I was forced to stick with a chronological feed for SkySwim.

The problem still presents itself, how can I create a feed that contains the latest tweets from whoever you're following, without long wait times? 

The quick answer: caching. 
The long answer: fan out on read + fan out on write + caching.

#### Fan out on read

When this technique is used on it's own, it's the slowest of them all. In this case, when a user X visits the newsfeed, SkySwim would need to find everyone X is following then for each of those user's, find their posts and finally limit all of the resulting posts to the max feed number.

```javascript
let followers = [];
db.follow.find({"user": "5e0bbf9ea11f6b54d68b70e9"})
    .forEach(doc => followers.push(doc.follower));
```

#### Fan out on write

When this technique is used on it's own, read times are significantly improved but write times take a big hit. In this case, when a user X makes a post, SkySwim will create a copy of the post for each of X's follower's (lots of redundant data). Here, creating a user's newsfeed is equivalent to finding all of their posts.

```javascript
db.post.find({"recipient": "5e0bbf9ea11f6b54d68b70e9"});
```

#### Cached feeds

When all hope is lost, here comes feed caching to save to day! In this most optimal scenario, a user would only have to [fan out on read](#fan-out-on-read) once. After this fan out, we cache the posts retrieved into a Feed collection, to be read on further requests:

```javascript
const feedSchema = new Schema({
	user: { type: String, required: true, unique: true },
	posts: [{ type: ObjectId, ref: 'post', required: true }],
	updated: Date
});
feedSchema.index({ user: 1, updated: -1 });
feedSchema.index({ updated: 1 }, { expireAfterSeconds: (60 * 60 * 24 * 30) })
```

Now we need to update this cached feed everytime one of the people our user is following makes a post, this is where the [fan out on write](#fan-out-on-write) comes into play. Once a user makes a post, they needs to update the cached feeds of all their followers so that they can see the user's post. We then place a cap on the number of posts stored in a cache and only keep the latest posts:

```javascript
Follow.find({ user: "5e0bbf9ea11f6b54d68b70e9" })
		.then(follows => {
			// send out update for each follower
			follows.forEach(relation => {
				Feed.findOneAndUpdate(
				    { user: relation.follower }, 
				    { $push: { posts: { $each: [newPost], $position: 0, $slice: feedLimit } }} ).exec();
			})
		});
```

Now all is pretty. All but one thing: why is this any better than just doing a [fan out on write](#fan-out-on-write)? Then answer: it's not. Not yet.

In large scale social media applications, it turns out there are a lot of `inactive users`. These are users who don't actively check their feeds, and thus don't need their feeds to updated. Why waste the time it takes to update their feeds if they're not going to need it? This problem is taken care of by adding a [time to live (TTL) index](https://docs.mongodb.com/manual/core/index-ttl/) to the cached feeds. If a user hasn't viewed their feed for a specified amount of time, the cache gets deleted and if the user has no cache, whoever they're following doesn't need to update them on every write. Therefore, when a user creates a post, they only need to fan out to a fraction of their followers! Exciting!

## Results

<a href="http://www.youtube.com/watch?feature=player_embedded&v=AaeUz1e_dBk
" target="_blank"><img src="http://img.youtube.com/vi/AaeUz1e_dBk/0.jpg" 
alt="video demo" width="240" height="180" border="10" /></a>

