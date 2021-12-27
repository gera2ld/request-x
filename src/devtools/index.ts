import browser from '#/common/browser';

async function main() {
  await browser.devtools.panels.create(
    'Request X',
    '/public/images/icon_38.png',
    '/devtools/panel.html'
  );
}

main();
