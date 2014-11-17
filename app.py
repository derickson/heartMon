import tornado.ioloop
import tornado.web
from tornado.httpclient import HTTPError
from pymongo import MongoClient
from bson.objectid import ObjectId
from bson.json_util import dumps
from bson.errors import InvalidId

import json
import heartMon

static_path = './static'
mongosHost = 'localhost'
mongosPort = 61017



class RedirectHandler(tornado.web.RequestHandler):
	def prepare(self):
		print("Redirecting")
		self.redirect("/index.html")
	def get(self):
		self.write("")

class ServiceHandler(tornado.web.RequestHandler):
	def initialize(self, db):
		self.db = db
	def get(self):
		self.write("Service Service %i" % self.db.count())



mongos = MongoClient(mongosHost, mongosPort)


application = tornado.web.Application([
	(r'/heartMon', heartMon.ResultsHandler, dict(dbClient=mongos)),

	(r'/', RedirectHandler),
	(r'/(.*)', tornado.web.StaticFileHandler, {'path': static_path})
], debug=False)

if __name__ == "__main__":
    application.listen(8888)
    tornado.ioloop.IOLoop.instance().start()

