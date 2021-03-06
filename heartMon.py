
from pymongo import MongoClient
from pymongo import MongoReplicaSetClient
from pymongo import ASCENDING, DESCENDING
from bson.json_util import dumps

import tornado.ioloop
import tornado.web

def heartMon(client):
	status = {}
	status['shards'] = []
	configDb = client.config
	deep = 0
	c = None
	shardClients = {}

	for s in configDb.shards.find().sort( "_id", ASCENDING):
		hostString = s[u'host']
		repSet = hostString.split("/",1)[0]
		hosts = hostString.split("/",1)[1]
		if( repSet in shardClients ):
			c = shardClients[repSet]
		else:
			c = MongoReplicaSetClient(hosts_or_uri=hosts, replicaSet=repSet)
			shardClients[repSet] = c

		shard = {
			'name': str(repSet),
			'machines': []
		}

		repStatus = c.admin.command('replSetGetStatus')
		counters = c.admin.command('serverStatus')[u'opcounters']

		for stat in repStatus[u'members']:
			shard['machines'].append({
				'id': str(stat[u'_id']),
				'name': str(stat[u'name']),
				'state': str(stat[u'stateStr']),
				'counters': {
					'insert': counters[u'insert'],
					'query': counters[u'query'],
					'update': counters[u'update'],
					'delete': counters[u'delete'],
					'getmore': counters[u'getmore'],
					'command': counters[u'command']
				}
			} )
		repStatus[u'members']
		deep = max(deep, len(shard['machines']))

		status['shards'].append(shard)

	for key in shardClients:
		shardClients[key].close()

	status['wide'] = len(status['shards'])
	status['deep'] = deep

	##client.close()
	return status
	
class ResultsHandler(tornado.web.RequestHandler):
	def initialize(self, dbClient):
		self.dbClient = dbClient
	def get(self):

		status = heartMon(self.dbClient)

		self.write(dumps(status))
		self.set_header("Content-Type", "application/json")