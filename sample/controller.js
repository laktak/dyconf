
// if you `require` any libraries you can add them to package.json &
// run `npm i` in the directory that contains this file.

var max;

// init runs at startup to configure options and initialize prerequisites

function init(ctx, showHelp) {
  var args=ctx.args;

  if (showHelp || ctx.argv.length>0) {
    console.error("usage: -max=#");
    console.error();
    console.error("  -max      max random sample value");
    console.error(ctx.helpText);
    return false;
  }

  max=parseInt(args.max||"999");
  return true;
}

// fetchData can be used to query an external service (like consul)
// it needs to return a data structure that will be used to generate the template
function fetchData(ctx) {
  return new Promise((resolve, reject) => resolve(Math.random()*max))
    .then(x => ({ random: x }));
}

// start the update process (optional)
// can be used to implement a watch on a service
function start(ctx, update) {
  setInterval(update, 1000);
  update();
}

module.exports={
  init: init,
  fetchData: fetchData,
  start: start,
};
