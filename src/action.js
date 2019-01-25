var documentClone = document.cloneNode(true);
var article = new Readability(documentClone).parse();
article.images = {};
article.content.querySelectorAll('img').forEach((img, index) => {
    let key = `img${('000000' + index).slice(-6)}`;
    article.images[key] = img.src;
    img.src = key;
});
article.content = article.content.innerHTML;
article.url = window.location.href;
chrome.runtime.sendMessage(article);
