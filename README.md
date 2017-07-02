# SQS Top

Displays key CloudWatch metrics for SQS queues

## Metrics

* MessagesVisible - # of messages currently in the queue (not in flight)
* MessagesInvisible - # of outstanding messages (in flight)
* OldestMessage - approximate age of oldest message in seconds

## Navigation

* v - sort by MessagesVisible
* i - sort by MessagesInvisible
* o - sort by OldestMessage
* q/esc/Ctrl-C - quit
* j - down one
* k - up one
* g - back to top

