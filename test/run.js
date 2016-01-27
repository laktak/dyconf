
var fs=require("fs");
var path=require("path");
var child_process=require("child_process");
var rootDir=path.normalize(__dirname);

var argv=process.argv.slice(2)
var filter=argv[0];

function failErr(name, s1, s2) {
  console.log(name+" FAILED!");
  if (s1 || s2) {
    console.log("--- actual:");
    console.log(s1);
    console.log("--- expected:");
    console.log(s2);
  }
  process.exit(1);
}

function load(file) {
  var text=fs.readFileSync(path.join(rootDir, file), "utf8");
  return text.replace(/\r/g, ""); // make sure we have unix style text regardless of the input
}

function test(name) {
  var expect=load(name+".txt");
  var shouldFail=name.substr(0, 4) === "fail";

  try {
    var p=child_process.spawnSync("node", [ "../main.js", "-config="+name+".hjson", "-q", "-dump" ], { cwd: rootDir });
    var result=p.stdout.toString();
    if (expect!==result) failErr(name, result, expect);
  }
  catch (err) {
    if (!shouldFail) failErr(name, "exception", err.toString(), "");
  }
}

console.log("running tests...");

fs.readdirSync(rootDir).forEach(function(file) {
  var name=file.split(".");
  if (name.length<2 || name[1]!=="hjson") return;
  name=name[0];

  if (filter && name.indexOf(filter)<0) return; // ignore
  test(name);

  console.log("- "+name+" OK");
});

console.log("ALL OK!");
