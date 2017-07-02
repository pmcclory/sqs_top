var AWS = require('aws-sdk');
var async = require('async');
var https = require('https');
var agent = new https.Agent({
        maxSockets: 25
});
var sqstopui = require('./ui.js');

AWS.config.update({
    httpOptions: {
        agent: agent
    }
});

var keep_running = true;
var interval = null;

var METRICS = [ "ApproximateNumberOfMessagesVisible", "ApproximateNumberOfMessagesNotVisible", "ApproximateAgeOfOldestMessage" ];
var COL_NAMES = [ "QueueName", "MessagesVisible", "MessagesInvisible", "OldestMessage" ];

var queue_data = {};
// setup the ui
var ui = new sqstopui.SQSTopUI(COL_NAMES, function () { ui.setRows(sortQueueData()); });

function sortQueueData() {
    var rowData = [], key = null, result = null;
    for (key in queue_data) {
        result = queue_data[key];
        rowData.push([key, result[METRICS[0]], result[METRICS[1]], result[METRICS[2]]]);
    }
    return rowData.sort(function (a, b) {
        var col = ui.sortColumn;
        if (a[col] < b[col]) {
            return 1;
        }
        if (a[col] == b[col]) {
            return 0;
        }
        else {
            return -1;
        }
    })
}

/*
 * define a function that fetches a given metric for a given queue
 */
function metric_fetch_gen(cw, queue_name, metric_name) {
    var f = function(callback) {
        //console.log("fetching " + metric_name + " for queue " + queue_name)
        var end = new Date();
        // fetch the last 30 minutes of data, but return the most recent data point
        var start = new Date(end.getTime() - 60 * 30 * 1000);
        var params = {
            EndTime: end,
            MetricName: metric_name, /* required */
            Namespace: 'AWS/SQS', /* required */
            Period: 60, /* required */
            StartTime: start,
            Dimensions: [{
                Name: 'QueueName', /* required */
                Value: queue_name /* required */
            }],
            Statistics: [ "Sum" ],
        };
        cw.getMetricStatistics(params, function(err, data) {
            if (err) {
                console.log(err, err.stack); // an error occurred
                callback(err, null);
                return;
            }
            var metric_data = 0;
            if (data['Datapoints'].length != 0) {
                var newest = null;
                for (var i in data['Datapoints']) {
                    if (newest == null)
                        newest = data['Datapoints'][i];
                    else if (data['Datapoints'][i]['Timestamp'] > newest['Timestamp'])
                        newest = data['Datapoints'][i];
                }
                metric_data = newest['Sum'];
            }
            result = {
                'queue_name': queue_name,
                'metric_name' : metric_name,
                'data' : metric_data
            };
            callback(err, result);
        });
    }
    return f;
}

async.waterfall([
    /*
     * first get the list of queues
     */
    function(outer_callback) {
        AWS.config.update({region:'us-west-2'});
        var sqs = new AWS.SQS();
        sqs.listQueues(callback = function(err, data) {
            var d = [];
            if (err) {
                console.log("list queues failed...");
                console.log(err);
            } else {
                d = data['QueueUrls'];
            }
            outer_callback(err, d);
        })
    },
    /*
     * then in parallel try to fetch their metrics
     */
    function(queue_urls, callback) {
        var cb = function() {
            var cw = new AWS.CloudWatch();
            var funcs = [];
            for (var i in queue_urls) {
                queue_name = queue_urls[i].split('/')[4];
                funcs.push(metric_fetch_gen(cw, queue_name, METRICS[0]));
                funcs.push(metric_fetch_gen(cw, queue_name, METRICS[1]));
                funcs.push(metric_fetch_gen(cw, queue_name, METRICS[2]));
            }
            async.parallel(funcs, function(err, results) {
                for (var i in results) {
                    var result = results[i];
                    var qn = result['queue_name'];
                    var metric = result['metric_name'];
                    var data = result['data'];
                    if (!(qn in queue_data)) {
                        queue_data[qn] = {};
                    }
                    queue_data[qn][metric] = data;
                }
                ui.setRows(sortQueueData());
            })
        }
        /*
         * run it once
         */
        cb();
        //and run it again every minute
        interval = setInterval(cb, 60 * 1000);
        //TODO - do we need to call the waterfall callback???
    }
]);

