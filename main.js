#!/usr/bin/env node

/*! @preserve
 * dyconf
 *
 * Copyright 2016 Christian Zangl, MIT license
 * Details and documentation:
 * https://github.com/laktak/any-json
 */

var fs=require("fs");
var path=require("path");
var util=require("util");
var child_process=require("child_process")
var Hjson=require("hjson");
var Tail=require("tail").Tail;
var Template=require("lodash.template");
var timestamp=require("internet-timestamp");

var helpText="\n"+
  "  -config   path to the template configuration\n"+
  "  -dump     dumps the generated template to the console\n"+
  "  -q        quiet, no logs\n"+
  "\n"+
  "  See https://github.com/laktak/dyconf for details.\n";

var args={}, argv=[];
process.argv.slice(2).forEach(x => { if (x[0]==="-") { var i=x.indexOf("="); args[x.substr(1, i>0?i-1:undefined)]=i>0?x.substr(i+1):true; } else argv.push(x); });

var baseDir, configFile, config;
var controller, compiledTemplate, result;
var outputFile, tailFile;

if (args.config) {
  configFile=path.resolve(args.config);
  config=Hjson.parse(fs.readFileSync(configFile, "utf8"));
  baseDir=path.dirname(configFile);

  try { compiledTemplate=Template(config.template); }
  catch (e) { log("Error parsing template: "+e); process.exit(1); }

  controller=require(path.resolve(baseDir, config.controller));
  outputFile=path.resolve(baseDir, config.outputFile);
  if (config.logFile) tailFile=path.resolve(baseDir, config.logFile);

  var context={
    args: args,
    argv: argv,
    config: config,
    log: log,
    helpText: helpText,
  };

  if (!controller.init(context, args["-help"] || args["-?"] || args["?"])) process.exit(1);

} else {
  console.error("usage: dyconf -config=FILE [OPTIONS]");
  console.error(helpText);
  process.exit(1);
}

function log(text) {
  if (!args.q)
    console.log(timestamp(new Date()), "localhost", "dyconf["+process.pid+"]:", text);
}

function execCmd(cmd, sync) {
  log("Exec "+cmd);
  var exec=sync?child_process.spawnSync:child_process.spawn;
  exec("sh", [ "-c", config[cmd] ], { stdio: [ "ignore", "inherit", "inherit" ] });
}

function update() {
  controller.fetchData(context).then(data => {
    var text=compiledTemplate(data);
    if (text!==result) {
      var isStartup=!config.didStart;
      var exec=isStartup?"startup":"reload";
      config.didStart=true;
      if (!isStartup) log("Config changed");
      log("Save template output to "+outputFile);
      fs.writeFileSync(outputFile, text, "utf8");
      result=text;
      if (args.dump) console.log(text);
      execCmd(exec);
    }
  });
}

process.on("exit", code => {
  execCmd("shutdown", true);
});

process.on("SIGTERM", () => {
  log("Received SIGTERM");
  process.exit(0);
});

process.on("SIGHUP", () => {
  log("Trigger forced reload");
  result="";
});

if (tailFile) {
  fs.closeSync(fs.openSync(tailFile, "wx"));
  var tail=new Tail(tailFile);
  tail.on("line", console.log);
  tail.on("error", err => console.error("#tail error: "+err));
}

if (controller.start) {
  controller.start(context, update);
} else {
  var interval=(config.refreshInterval||5)*1000;
  if (interval>0) setInterval(update, interval);
  update();
}
