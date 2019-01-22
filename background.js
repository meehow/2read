const gateways = [
    'ipfs.io',
    'hardbin.com',
    'ipfs.eternum.io',
    'cloudflare-ipfs.com',
    'siderus.io',
    'ipfs.infura.io'
];

function renderPage(title, content) {
    return `<!DOCTYPE html>
<html>
    <head>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <link rel="stylesheet" href="/ipfs/QmSMwjABWVBsnS3Gha3xmjb5zKYndvFrS74iCAwykQCqcY/typesettings-1.2-min.css">
        <title>${title}</title>
        <style>
            footer { padding: 3em 0; text-align: center; font-size: 1.4em; border-top: 1px solid #e1e1e1;}
            a:hover { color: #222; border-bottom-color: #555; }
            @media only screen and (min-width: 1441px) { .typesettings { font-size: 2.4em; } }
            .typesettings { max-width: 33em; margin: 0 auto; }
            a { color: #aeaeae; border-bottom: 1px dotted #aeaeae; text-decoration: none; }
            img { max-width: 100% }
        </style>
    </head>
    <body>
        <article class="typesettings golden">
            <h1 style="margin-bottom: 1em">${title}</h1>
            ${content}
        </article>
        <footer><a href="https://2read.tk/">2read.tk</a></footer>
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

function pinLocally(hash) {
    return fetch(`http://localhost:5001/api/v0/pin/add?arg=${hash}`);
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
    hash = await ipfsPUT(hash, renderPage(article.title, article.content), 'index.html');
    for (let img in article.images) {
        let response = await fetch(article.images[img]);
        if (!response.ok) {
            console.error(`${response.status} - ${response.statusText}`);
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
