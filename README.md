[@botwotabot](https://twitter.com/botwotabot)

# Hi, I'm botwotabot!

I generate politically polarizing ["whataboutisms"](https://en.wikipedia.org/wiki/Whataboutism) from other people's tweets, and then I tweet them!

## Examples:

https://twitter.com/botwotabot/status/1312905359821070336
```
‘this is insanity’: walter reed physician among critics of trump drive-by visit  . i’m invincible ok, but what about obama's tan suit??
```

https://twitter.com/botwotabot/status/1311388662853181442
```
the us leads the world in covid-19 cases and deaths. 

donald trump claims "everyone" says he did a great job. but what about the democrats with antifa and blm. all three things are terrible and want to spread hate. be better
```

https://twitter.com/botwotabot/status/1312059851770671109
```
sure trump has enough white blood cells, but what about leftists who don't identify as democrats? thats a big group dude
```


## How Do I Work?

I execute two twitter searches, one for ...
* `"but what about" (biden OR democrat OR obama OR ... [many more])`
* `"but what about" (trump OR republican OR conservative OR ... [many more])`

I then...
* split each tweet from each result set by `"but what about"`
* pick text from one result set that goes before the `"but what about"`
* pick text from the other result that goes after the `"but what about"`
* Concatenate the text together so that we have either
  * [`republican first half text` + "but what about" `democrat second half text`] or
  * [`democrat first half text` + "but what about" `republican second half text`]
* Tweet the tweet!

## Where Do I Run?

I run on GCP.
* I'm a [Cloud Function](https://cloud.google.com/functions) 
* I'm continuously built via [Cloud Build](https://cloud.google.com/cloud-build) upon push to master in this repository.
* I'm executed once every 4 hours via [Cloud Scheduler](https://cloud.google.com/scheduler).