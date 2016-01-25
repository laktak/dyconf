#!/usr/bin/env node

var fs=require("fs");
var path=require("path");
var util=require("util");
var child_process=require("child_process")
var Hjson=require("hjson");
var Tail=require("tail").Tail;
var _=require("lodash");
var timestamp=require("internet-timestamp");

var args={}, argv=[];
process.argv.slice(2).forEach(function(x) { if (x[0]==="-") { var i=x.indexOf("="); args[x.substr(1, i>0?i-1:undefined)]=i>0?x.substr(i+1):true; } else argv.push(x); });

var baseDir, configFile, config;
var tpl, compiledTemplate, result;
var outputFile, tailFile;

if (args.config) {
  configFile=path.resolve(args.config);
  config=Hjson.parse(fs.readFileSync(configFile, "utf8"));
  baseDir=path.dirname(configFile);

  tpl=require(path.resolve(baseDir, config.templateFile));
  outputFile=path.resolve(baseDir, config.outputFile);
  tailFile=path.resolve(baseDir, config.logFile);

  try { compiledTemplate=_.template(tpl.template); }
  catch (e) { log("Error parsing template: ", e); }

  var context={
    args: args,
    argv: argv,
    config: config,
    log: log,
  };

  if (!tpl.init(context, args["-help"] || args["-?"] || args["?"])) process.exit(1);

} else {
  console.error("usage: -config=FILE");
  console.error();
  console.error("  -config: path to the Hjson configuration");
  console.error();
  console.error("  See https://github.com/laktak/dyconf for details.");
  console.error();
  process.exit(1);
}

function log(text) {
  console.log(timestamp(new Date()), "localhost", "template["+process.pid+"]:", text);
}

function execCmd(cmd) {
  log("Exec "+cmd);
  var p=child_process.spawn("sh", [ ], { stdio: [ "pipe", "inherit", "inherit" ] });
  p.stdin.write(config[cmd]);
  p.stdin.end();
}

function update() {
  tpl.fetchData(context).then(function(data) {
    var text=compiledTemplate(data);
    if (text!==result) {
      var isStartup=!config.didStart;
      var exec=isStartup?"startup":"reload";
      config.didStart=true;
      if (!isStartup) log("Config changed");
      log("Save template output to "+outputFile);
      fs.writeFileSync(outputFile, text, "utf8");
      result=text;
      execCmd(exec);
    }
  });
}

process.on("SIGTERM", function() {
  log("Received SIGTERM");
  execCmd("shutdown");
  process.exit(0);
});

process.on("SIGHUP", function() {
  log("Trigger forced reload");
  result="";
});

if (tailFile) {
  fs.closeSync(fs.openSync(tailFile, "wx"));
  var tail=new Tail(tailFile);
  tail.on("line", console.log);
  tail.on("error", function(err) { console.error("#tail error: "+err); });
}

setInterval(update, 5000);
update();
