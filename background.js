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

function ipfsPUT(hash, data, filename) {
    return new Promise((resolve, reject) => {
        let req = new XMLHttpRequest();
        req.onreadystatechange = () => {
            if (req.readyState != XMLHttpRequest.DONE) return;
            if (req.status < 200 || req.status >= 300) {
                return reject(`Unexpected status ${req.statusText} - ${req.status}`);
            }
            let hash = req.getResponseHeader("Ipfs-Hash");
            resolve(hash);
        };
        req.onerror = reject;
        req.open('PUT', `https://ipfs.eternum.io/ipfs/${hash}/${filename}`, true);
        req.setRequestHeader('Content-Type', 'text/html');
        req.send(data);
    });
}

function pinLocally(hash) {
    var req = new XMLHttpRequest();
        req.open('GET', `http://localhost:5001/api/v0/pin/add?arg=${hash}`);
        req.send();
}

function seed(hash) {
    for (let gateway of gateways) {
        var req = new XMLHttpRequest();
        req.open('GET', `https://${gateway}/ipfs/${hash}/`);
        req.send();
    }
}

async function handleClick() {
    await browser.tabs.executeScript({ file: 'Readability.js' });
    var result = await browser.tabs.executeScript({ file: 'action.js' });
    let article = result[0];
    // hash of empty folder
    let hash = 'QmUNLLsPACCz1vLxQVkXqqLX5R1X345qqfHbsf67hvA3Nn';
    hash = await ipfsPUT(hash, renderPage(article.title, article.content), 'index.html');
    for (let img in article.images) {
        var response = await fetch(article.images[img], { mode: 'no-cors' });
        if (response.status < 200 || response.status >= 400) {
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
