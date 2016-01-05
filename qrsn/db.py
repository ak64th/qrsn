from datetime import datetime

from peewee import SqliteDatabase, Model, IntegerField, CharField, DateTimeField

db = SqliteDatabase('node.db', threadlocals=True)


class PeeweeConnectionMiddleware(object):
    def process_request(self, req, resp):
        db.connect()

    def process_response(self, req, resp, resource):
        if not db.is_closed():
            db.close()


class Base(Model):
    created = DateTimeField(default=datetime.utcnow)

    class Meta:
        database = db


class Answered(Base):
    question = IntegerField(verbose_name=u'Question ID')
    user = IntegerField(verbose_name=u'User ID')
    selected = CharField(verbose_name=u'Selected Option ID List')
    game = IntegerField(verbose_name=u'Game ID')


class Score(Base):
    user = IntegerField(verbose_name=u'User ID')
    game = IntegerField(verbose_name=u'Game ID')
    score = IntegerField(verbose_name=u'Score')


