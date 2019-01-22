const gateways = [
    'ipfs.io',
    'hardbin.com',
    'ipfs.eternum.io',
    'cloudflare-ipfs.com',
    'siderus.io',
    'ipfs.infura.io'
];

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
    let response = await fetch(`https://ipfs.eternum.io/ipfs/${hash}/${filename}`, {
        method: 'PUT',
        body: body,
        headers: { 'Content-Type': 'text/html' },
    });
    if (!response.ok) {
        throw `Unexpected status ${response.statusText} - ${response.status}`;
    }
    return response.headers.get('ipfs-hash');
}

async function pinLocally(hash) {
    // TODO: handle non-standard port configuration or use window.ipfs
    let req = new XMLHttpRequest();
    req.open('GET', `http://localhost:5001/api/v0/pin/add?arg=${hash}`);
    req.send();
}

function seed(hash) {
    for (let gateway of gateways) {
        fetch(`https://${gateway}/ipfs/${hash}/`);
    }
}

async function handleClick() {
    await browser.tabs.executeScript({ file: 'Readability.js' });
    let result = await browser.tabs.executeScript({ file: 'action.js' });
    let article = result[0];
    // hash of empty folder
    let hash = 'QmUNLLsPACCz1vLxQVkXqqLX5R1X345qqfHbsf67hvA3Nn';
    hash = await ipfsPUT(hash, renderPage(article), 'index.html');
    for (let img in article.images) {
        let response = await fetch(article.images[img]);
        if (!response.ok) {
            console.error(`Unexpected status ${response.status} - ${response.statusText}`);
            continue;
        }
        hash = await ipfsPUT(hash, await response.blob(), img);
    }
    let url = `https://${gateways[0]}/ipfs/${hash}/`;
    browser.tabs.create({ url: url });
    browser.bookmarks.create({ title: article.title, url: url });
    pinLocally(hash);
    seed(hash);
}

browser.browserAction.onClicked.addListener(handleClick);
