![Screen Shot](https://raw.githubusercontent.com/derickson/heartMon/master/heart.png)

heartMon is a python tornado REST service for checking the status and performance of all replica sets attached to a healthy mongos server of MongoDB 

This is meant as sample code to help build a JQuery compatible widget for a demo UI or to be used as a standalone near-real time monitor to leave up while running some other UI during a demo.

Configuration
----
* note, this widget only works with a sharded MongoDB setup
* The hostname and port of the "mongos" process is needs to be hard coded into the top of app.py


Instructions
----
* python app.py
* browse to http://localhost:8888

