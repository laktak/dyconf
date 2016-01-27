
function fetchData(ctx) {
  return new Promise((resolve, reject) => {
    resolve({
      services: [
        {
          name: "foo",
          nodes: [ "a", "b" ],
        },
        {
          name: "bar",
          nodes: [ "b", "c", "d" ],
        },
      ],
    });
  });
}

module.exports={
  init: (ctx, showHelp) => true,
  fetchData: fetchData,
};
