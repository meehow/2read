var documentClone = document.cloneNode(true);
var article = new Readability(documentClone).parse();
article.images = {};
var counter = 1;
for (let img of article.content.querySelectorAll('img')) {
    let key = `img${("000000" + counter++).slice(-6)}`;
    article.images[key] = img.src;
    img.src = key;
}
article.content = article.content.innerHTML;
article.url = window.location.href;
article;