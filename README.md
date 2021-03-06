# dyconf

dyconf can be used to generate a dynamically updated configuration from a template. It can also launch processes whenever a change is detected.

dyconf is a tool, not a library. It is best suited to run inside a docker container.

**TL;DR** you can find a working sample in [consul-haproxy-dyconf](https://github.com/laktak/consul-haproxy-dyconf).


### How does this compare to consul-template or confd?

- dyconf is not tied to a specific backend. You can use it with ZooKeeper, etcd, ... or your own REST services.
- It uses node.js so you have access to npm modules.
- dyconf uses [lodash templates](https://lodash.com/docs#template) which, if you know JavaScript, might be easier to grok than the golang text templates that are used by confd and consul-template.


## Install from npm

```
npm install dyconf -g
```

## Usage

```
usage: dyconf -config=FILE [OPTIONS]

  -config   path to the template configuration
  -dump     dumps the generated template to the console
  -q        quiet, no logs
```

When you launch dyconf you need to specify `-config=FILE`, all other parameters are passed to the controller.

## Configuration

The Hjson configuration defines the following settings:

- controller: path to the JavaScript controller (see below)
- outputFile: configuration file to write to
- refreshInterval: refresh interval in seconds unless handled by the controller
- syslog: set to `true` to run a syslog server and print to the console (useful with the docker logs command)
- logFile: path to a logfile to tail and print to the console (similar to syslog above)
- startup: a shell script to run at startup
- reload: a shell script to run whenever the configuration changes
- shutdown: a shell script to run at when the process is terminated
- template: inline template that will produce the output file

The controller can define additional settings.

*dyconf* uses [lodash.template](https://lodash.com/docs#template).

## Controller

The controller is a JavaScript module that is executed by dyconf.

All controller functions are passed a context that contains:
- args: CLI options (object)
- argv: CLI arguments (array)
- config: the template configuration
- log: logging function
- helpText: the standard help text (to append in init)

The module needs to export:

### init

`function init(ctx, showHelp)`

init can be used to
- evaluate commandline arguments,
- create server connections (if any) or
- show CLI help if showHelp is set.

Return true to continue, false to exit.

### fetchData

`function fetchData(ctx)`

Use fetchData to collect data required for the template.

Return a promise with the data that will be passed to the template.

### start (optional)

`function start(ctx, update)`

Starts the update process. If start is not supplied a fixed interval (`refreshInterval`) will be used.

You can use `start` to watch for changes. Call `update` to trigger `fetchData` and to create/refresh the output file.


# Sample

The *Hello World* source is available in the [sample folder](sample/).

## config.hjson

```
#hjson (go to http://hjson.org for details)
{
  # define the controller that fetches the configuration and produces the content for outputFile
  controller: controller.js
  outputFile: /tmp/test.txt

  # refresh interval in seconds
  refreshInterval: 5

  # start a syslog server listening on port 514 (use rfc5424)
  # can be used to redirect logs for Docker
  syslog: false

  # logfile to tail to the console (can be "")
  # can be used like syslog for Docker
  logFile: ""

  # run on start/restart
  startup:
    '''
    # prepare, configure files or run any required processes

    # here you would launch the main process (e.g. haproxy)
    # for the sample we only show the outputFile
    cat /tmp/test.txt
    '''

  # reload a new configuration
  reload:
    '''
    # here you would tell the main process (e.g. haproxy)
    # to reload it's configuration
    # for the sample we only show the outputFile
    echo ---
    cat /tmp/test.txt
    '''

  # run on shutdown
  shutdown:
    '''
    # here you would kill the main process
    '''

  # define the template to generate the outputFile
  /*
  `random` was generated by the code in controller.js
  */
  template:
    '''
    <% [ "World", "Human" ].forEach(name => {
    %>Hello <%=name%>!
    <% }); %>
    In a real world scenario this file would contain the configuration generated by dyconf.

    Today's random value is <%=random%>!
    '''
}
```

## controller.js

```
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
```
