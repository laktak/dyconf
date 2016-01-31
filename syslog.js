
// the following code was taken from https://github.com/chunpu/syslogd
// as I could not include it as a dependency (no way to work around the parser)

var dgram=require("dgram")

module.exports=exports=Syslogd;

function Syslogd(fn, opt) {
  if (!(this instanceof Syslogd)) return new Syslogd(fn, opt);
  this.opt=opt || {};
  this.handler=fn;
  this.server=dgram.createSocket("udp4");
}

Syslogd.prototype.listen=function(port, status_cb) {
  var server=this.server;
  if (this.port) return;
  this.port=port || 514; // default is 514
  var me=this;
  server
    .on("error", function(err) { status_cb(err); })
    .on("listening", function() { status_cb(null); })
    .on("message", function(msg, rinfo) { me.handler(parseSyslog(msg.toString()), rinfo); })
    .bind(port, this.opt.address);
  return this;
}

function parseSyslog(msg) {
  // https://tools.ietf.org/html/rfc5424
  var idx=msg.indexOf(" ");
  var end=msg.length;
  if (msg[end-1]==='\n') end--;
  msg=msg.substring(idx+1, end); // remove <PRI>VERSION
  return msg;
}
