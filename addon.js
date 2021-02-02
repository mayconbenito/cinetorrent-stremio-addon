require('dotenv').config()
const { addonBuilder, serveHTTP, publishToCentral } = require('stremio-addon-sdk')
const parseTorrent = require('parse-torrent')
const axios = require('axios')

const builder = new addonBuilder({
  id: 'org.mayconbenito.cinetorrent',
  version: '1.0.0',
  name: 'CineTorrent',
  description: 'Find Multi Language Torrent Streams for Movies and TV Shows supports (PT, EN and ES)',
  catalogs: [],
  resources: ['stream'],
  types: ['movie', 'series'],
  idPrefixes: ['tt'],
  contactEmail: 'mayconbenito21@gmail.com'
})

builder.defineStreamHandler(async function (args) {
  if (args.type === 'movie') {
    try {
      const response = await axios.get(`${process.env.SERVERLESS_FUNCTION_BASE_URL}/api/stremioAddonStreams?imdb_id=${args.id}`)

      if (response.status === 404) {
        return Promise.resolve({ streams: [] })
      }

      const streams = response.data.data.streams.map(stream => ({ name: `CineTorrent\n${stream.quality}`, title: `${response.data.data.title}\n${stream.language.map(language => language.toUpperCase())}`, infoHash: parseTorrent(stream.uri).infoHash }))

      return Promise.resolve({ streams })
    } catch (error) {
      console.log(error)
      return Promise.resolve({ streams: [] })
    }
  }

  if (args.type === 'series') {
    try {
      const [id, season_number, episode_number] = args.id.split(':')
      const response = await axios.get(`${process.env.SERVERLESS_FUNCTION_BASE_URL}/api/stremioAddonStreams?imdb_id=${id}&season_number=${season_number}&episode_number=${episode_number}`)

      if (response.status === 404) {
        return Promise.resolve({ streams: [] })
      }

      const streams = response.data.data.streams.map(stream => ({ name: `CineTorrent\n${stream.quality}`, title: `${response.data.data.title}\n${stream.language.map(language => language.toUpperCase())}`, infoHash: parseTorrent(stream.uri).infoHash }))

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
