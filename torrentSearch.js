const axios = require('axios');
const cheerio = require('cheerio');

async function searchYTS(query) {
  try {
    const domains = ['yts.mx', 'yts.lt', 'yts.am'];
    let response = null;

    for (const domain of domains) {
      try {
        const searchUrl = `https://${domain}/api/v2/list_movies.json?query_term=${encodeURIComponent(query)}&limit=20`;
        response = await axios.get(searchUrl, {
          timeout: 10000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
          }
        });
        break;
      } catch (err) {
        console.log(`YTS ${domain} failed, trying next...`);
        continue;
      }
    }

    if (!response) {
      throw new Error('All YTS domains failed');
    }

    const results = [];
    const movies = response.data?.data?.movies || [];

    movies.forEach(movie => {
      if (movie.torrents) {
        movie.torrents.forEach(torrent => {
          results.push({
            name: `${movie.title} (${movie.year}) [${torrent.quality}]`,
            seeders: torrent.seeds || 0,
            leechers: torrent.peers || 0,
            size: torrent.size,
            source: 'YTS',
            magnetLink: torrent.url,
            category: 'movies',
            thumbnail: movie.medium_cover_image || null
          });
        });
      }
    });

    return results;
  } catch (error) {
    console.error('YTS search error:', error.message);
    return [];
  }
}

async function searchNyaa(query) {
  try {
    const searchUrl = `https://nyaa.si/?f=0&c=0_0&q=${encodeURIComponent(query)}`;
    const response = await axios.get(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
      },
      timeout: 10000
    });

    const $ = cheerio.load(response.data);
    const results = [];

    $('tbody tr').each((_i, elem) => {
      const name = $(elem).find('td:nth-child(2) a:not(.comments)').last().text().trim();
      const magnetLink = $(elem).find('a[href^="magnet:"]').attr('href');
      const seeders = parseInt($(elem).find('td:nth-child(6)').text()) || 0;
      const leechers = parseInt($(elem).find('td:nth-child(7)').text()) || 0;
      const size = $(elem).find('td:nth-child(4)').text().trim();

      if (name && magnetLink) {
        results.push({
          name,
          seeders,
          leechers,
          size,
          source: 'Nyaa',
          magnetLink,
          category: 'anime'
        });
      }
    });

    return results;
  } catch (error) {
    console.error('Nyaa search error:', error.message);
    return [];
  }
}

async function searchLimeTorrents(query) {
  try {
    const searchUrl = `https://www.limetorrents.lol/search/all/${encodeURIComponent(query)}/`;
    const response = await axios.get(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
      },
      timeout: 10000
    });

    const $ = cheerio.load(response.data);
    const results = [];
    const promises = [];

    $('.table2 tr').each((i, elem) => {
      if (i === 0) return;
      if (i > 10) return;

      const name = $(elem).find('.tt-name a:nth-child(2)').text().trim();
      const size = $(elem).find('.tdnormal:nth-child(3)').text().trim();
      const seeders = parseInt($(elem).find('.tdseed').text()) || 0;
      const leechers = parseInt($(elem).find('.tdleech').text()) || 0;
      const detailLink = $(elem).find('.tt-name a:nth-child(2)').attr('href');

      if (name && detailLink) {
        const promise = axios.get(`https://www.limetorrents.lol${detailLink}`, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
          },
          timeout: 5000
        }).then(detailResponse => {
          const $detail = cheerio.load(detailResponse.data);
          const magnetLink = $detail('a[href^="magnet:"]').attr('href');

          if (magnetLink) {
            return {
              name,
              seeders,
              leechers,
              size,
              source: 'LimeTorrents',
              magnetLink,
              category: 'mixed'
            };
          }
          return null;
        }).catch(err => {
          console.error('Error fetching LimeTorrents detail:', err.message);
          return null;
        });

        promises.push(promise);
      }
    });

    const detailResults = await Promise.all(promises);
    return detailResults.filter(r => r !== null);

  } catch (error) {
    console.error('LimeTorrents search error:', error.message);
    return [];
  }
}

async function searchTorrentDownloads(query) {
  try {
    const searchUrl = `https://www.torrentdownloads.pro/search/?search=${encodeURIComponent(query)}`;
    const response = await axios.get(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9'
      },
      timeout: 10000
    });

    const $ = cheerio.load(response.data);
    const results = [];
    const promises = [];

    $('.grey_bar3').each((i, elem) => {
      if (i > 10) return;

      const nameElem = $(elem).find('a');
      const name = nameElem.text().trim();
      const detailLink = nameElem.attr('href');

      const parent = $(elem).parent();
      const cells = parent.find('td');

      const size = $(cells[1]).text().trim();
      const seeders = parseInt($(cells[2]).text()) || 0;
      const leechers = parseInt($(cells[3]).text()) || 0;

      if (name && detailLink && detailLink.startsWith('/')) {
        const promise = axios.get(`https://www.torrentdownloads.pro${detailLink}`, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
          },
          timeout: 5000
        }).then(detailResponse => {
          const $detail = cheerio.load(detailResponse.data);
          const magnetLink = $detail('a[href^="magnet:"]').attr('href');

          if (magnetLink) {
            return {
              name,
              seeders,
              leechers,
              size,
              source: 'TorrentDownloads',
              magnetLink,
              category: 'mixed'
            };
          }
          return null;
        }).catch(err => {
          console.error('Error fetching TorrentDownloads detail:', err.message);
          return null;
        });

        promises.push(promise);
      }
    });

    const detailResults = await Promise.all(promises);
    const validResults = detailResults.filter(r => r !== null);

    console.log(`TorrentDownloads: Found ${validResults.length} results`);
    return validResults;

  } catch (error) {
    console.error('TorrentDownloads search error:', error.message);
    return [];
  }
}

async function searchTorrents(query) {
  const [yts, nyaa, lime, td] = await Promise.allSettled([
    searchYTS(query),
    searchNyaa(query),
    searchLimeTorrents(query),
    searchTorrentDownloads(query)
  ]);

  const results = [
    ...(yts.value || []),
    ...(nyaa.value || []),
    ...(lime.value || []),
    ...(td.value || [])
  ];

  return results.sort((a, b) => b.seeders - a.seeders);
}

module.exports = { searchTorrents };
