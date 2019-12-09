const gateways = [
    { domain: 'ipfs.jes.xxx', writable: true },
    { domain: 'gateway.pinata.cloud', writable: false },
    { domain: 'hardbin.com', writable: true },
    { domain: 'ipfs.jeroendeneef.com', writable: false },
    { domain: 'permaweb.io', writable: false },
    { domain: 'ipfs.busy.org', writable: false },
    { domain: '10.via0.com', writable: false },
    { domain: 'ipfs.eternum.io', writable: true },
    { domain: 'jorropo.ovh', writable: false },
    { domain: 'ninetailed.ninja', writable: false },
    { domain: 'cloudflare-ipfs.com', writable: false },
    { domain: 'ipfs.greyh.at', writable: false },
    { domain: 'ipfs.best-practice.se', writable: false },
    { domain: 'gateway.ipfs.io', writable: false },
    { domain: 'ipfs.io', writable: false },
    { domain: 'gateway.temporal.cloud', writable: false },
    // { domain: 'ipfs.infura.io', writable: false },
];
var roGateways;
var rwGateways;

Promise.all(gateways.map(roundtrip)).then(gws => {
    roGateways = gws.filter(gw => gw.writable === false).sort(gw => -gw.roundtrip);
    rwGateways = gws.filter(gw => gw.writable === true).sort(gw => -gw.roundtrip);
    console.log(`2read found ${rwGateways.length} read-write and ${roGateways.length} read-only gateways.`)
});


async function roundtrip(gw) {
    const start = performance.now();
    const response = await fetch(`https://${gw.domain}/ipfs/QmRSzXkL6wKf2BmZon2jPv7K6uKDiYbtwsv1Qoz1Vviw3G/`);
    gw.roundtrip = performance.now() - start;
    if (!response || !response.ok || await response.text() != '2read.net') {
        console.error('Unexpected response', response);
        gw.writable = null;
    }
    return gw;
}

function renderPage(article) {
    return `<!DOCTYPE html>
<html>
    <head>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <link rel="stylesheet" href="/ipfs/QmcjLy7wEQbLJ4agdit9nvtq5exc7hQszEYwXX9ZzP7ff9/typesettings-1.7-min.css">
        <title>${article.title}</title>
        <style>
            footer { text-align: center; border-top: 1px solid #e1e1e1; }
            img { max-width: 100% }
        </style>
    </head>
    <body>
        <article class="typesettings golden">
            <section>
                <header><h1>${article.title}</h1></header>
                <p>${article.excerpt}</p>
                <p><address><a href="${article.url}">${article.byline || article.siteName || '&#9875;'}</a></address></p>
            </section>
            <section>${article.content}</section>
        </article>
        <footer class="typesettings"><small><a href="https://2read.net/">2read.net</a></small></footer>
    </body>
</html>`;
}

async function ipfsPUT(hash, body, filename) {
    for (let gw of rwGateways) {
        let response = await fetch(`https://${gw.domain}/ipfs/${hash}/${filename}`, {
            method: 'PUT',
            body: body,
            headers: { 'Content-Type': 'text/html' },
        });
        if (!response || !response.ok) {
            // image too big
            if (response.status == 413) {
                return hash;
            }
            console.error(`Unexpected response from ${gw.domain}`, response);
            continue;
        }
        let headersHash = response.headers.get('ipfs-hash');
        if (!headersHash) {
            console.error(`Empty hash from ${gw.domain}`, response);
            continue;
        }
        roGateways.forEach(gw => fetch(`https://${gw.domain}${response.headers.get('location')}`));
        return headersHash;
    }
    throw console.error('No writable gateway found');
}

async function pinLocally(hash) {
    // TODO: handle non-standard port configuration or use window.ipfs
    let req = new XMLHttpRequest();
    req.open('GET', `http://localhost:5001/api/v0/pin/add?arg=${hash}`);
    req.send();
}

function handleClick() {
    chrome.tabs.executeScript({ file: 'Readability.js' }, function () {
        chrome.tabs.executeScript({ file: 'action.js' });
    });
}

async function handleMessage(article) {
    // hash of empty folder
    let hash = 'QmUNLLsPACCz1vLxQVkXqqLX5R1X345qqfHbsf67hvA3Nn';
    hash = await ipfsPUT(hash, renderPage(article), 'index.html');
    for (let img in article.images) {
        let response = await fetch(article.images[img]);
        if (!response || !response.ok) {
            console.error('Unexpected response', response);
            continue;
        }
        hash = await ipfsPUT(hash, await response.blob(), img);
    }
    let url = `https://${roGateways[0].domain}/ipfs/${hash}/`;
    chrome.tabs.create({ url: url });
    chrome.bookmarks.create({ title: article.title, url: url });
    pinLocally(hash);
}

chrome.browserAction.onClicked.addListener(handleClick);
chrome.runtime.onMessage.addListener(handleMessage);
