require('dotenv').config()
const { addonBuilder, serveHTTP, publishToCentral } = require('stremio-addon-sdk')
const parseTorrent = require('parse-torrent')
const axios = require('axios')
const Redis = require("ioredis");

const builder = new addonBuilder({
  id: 'org.mayconbenito.cinetorrent',
  version: '1.0.0',
  name: 'CineTorrent',
  description: 'Find Multi Language Torrent Streams for Movies and TV Shows supports (Rarbg, Yts, 1337x)',
  catalogs: [],
  resources: ['stream'],
  types: ['movie', 'series'],
  idPrefixes: ['tt'],
  contactEmail: 'mayconbenito21@gmail.com'
})

const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD || 'root',
  keyPrefix: 'cache:',
  lazyConnect: true,
  maxRetriesPerRequest: 1
}); 

builder.defineStreamHandler(async function (args) {
  if (args.type === 'movie') {
    try {
      const response = await axios.get(`${process.env.SERVERLESS_FUNCTION_BASE_URL}/stremioAddonStreams?imdb_id=${args.id}`)

      const cachedResponse = await redis.get(`streams-${args.id}`)

      if (cachedResponse) {
        return Promise.resolve({ streams: JSON.parse(cachedResponse) })
      }

      const streams = response.data.data.streams.map(stream => ({ name: `CineTorrent\n${stream.quality}`, title: `${response.data.data.title}\n${stream.language.toUpperCase()}`, infoHash: parseTorrent(stream.url).infoHash }))

      if (streams.length > 0) {
        redis.set(`stream-${args.id}`, JSON.stringify(streams), 'EX', 60 * 60 * 360)
      }

      redis.set(`stream-${args.id}`, JSON.stringify(streams), 'EX', 60 * 60 * 360)
      
      return Promise.resolve({ streams })
    } catch (error) {
      console.log(error)
      return Promise.resolve({ streams: [] })
    }
  }

  if (args.type === 'series') {
    try {
      const [id, season_number, episode_number] = args.id.split(':')
      const response = await axios.get(`${process.env.SERVERLESS_FUNCTION_BASE_URL}/stremioAddonStreams?imdb_id=${id}&season_number=${season_number}&episode_number=${episode_number}`)

      const cachedResponse = await redis.get(`streams-${args.id}`)

      if (cachedResponse) {
        return Promise.resolve({ streams: JSON.parse(cachedResponse) })
      }

      const streams = response.data.data.streams.map(stream => ({ name: `CineTorrent\n${stream.quality}`, title: `${response.data.data.title}\n${stream.language.toUpperCase()}`, infoHash: parseTorrent(stream.url).infoHash }))

      if (streams.length > 0) {
        redis.set(`stream-${args.id}`, JSON.stringify(streams), 'EX', 60 * 60 * 360)
      }

      redis.set(`stream-${args.id}`, JSON.stringify(streams), 'EX', 60 * 60 * 360)

      return Promise.resolve({ streams })
    } catch (error) {
      console.log(error)
      return Promise.resolve({ streams: [] })
    }
  }
})

if (process.env.NODE_ENV === 'production') {
  publishToCentral(`https://cinetorrent.herokuapp.com/manifest.json`)
}

serveHTTP(builder.getInterface(), { port: process.env.PORT || 7000 })
