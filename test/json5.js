var connect = require('connect')
  , assert = require('assert')
  , request = require('supertest')

var express_json5 = require('..')

var app = connect()

app.use(express_json5({ limit: '1mb' }))

app.use(function(req, res) {
	res.end(JSON.stringify(req.body))
})

app.use(function(err, req, res, next) {
	res.statusCode = err.status
	res.end(err.message)
})

describe('express_json5()#json5', function(){
  it('should parse JSON', function(done){
    request(app)
    .post('/')
    .set('Content-Type', 'application/json5')
    .send("{user:/*comment*/'tobi'}")
    .end(function(err, res){
      res.text.should.equal('{"user":"tobi"}');
      done();
    });
  })

  it('should fail gracefully', function(done){
    request(app)
    .post('/')
    .set('Content-Type', 'application/json5')
    .send('{user:123,!')
    .end(function(err, res){
      res.text.should.equal("Unexpected token '!' at 1:11\n{user:123,!\n          ^");
      done();
    });
  })

  describe('when strict is true', function(){
    it('should allow leading comments in JSON', function(done){
      var app = connect();
      app.use(express_json5({ strict: true }));

      app.use(function(req, res){
        res.end(JSON.stringify(req.body));
      });

      request(app)
      .post('/')
      .set('Content-Type', 'application/json5')
      .send(' /* comment! */  { user: "tobi" }')
      .end(function(err, res){
        res.should.have.status(200);
        res.text.should.include('{"user":"tobi"}');
        done();
      });
    })

    it('should not allow null', function(done){
      var app = connect();
      app.use(express_json5({ strict: true }));

      app.use(function(req, res){
        res.end(JSON.stringify(req.body));
      });

      request(app)
      .post('/')
      .set('Content-Type', 'application/json5')
      .send('null')
      .end(function(err, res){
        res.should.have.status(400);
        res.text.should.include('invalid json');
        done();
      });
    })
  })

  it('should support utf-8', function(done){
    var app = connect();

    app.use(express_json5());

    app.use(function(req, res, next){
      res.end(JSON.stringify(req.body));
    });

    request(app)
    .post('/')
    .set('Content-Type', 'application/json; charset=utf-8')
    .send('{论: 123}')
    .expect('{"论":123}', done);
  })

  describe('the default json mime type regular expression', function() {
    var mimeRegExp = express_json5.regexp;
    it('should support JSON5 mime type', function(){
      mimeRegExp.test('application/json5').should.eql(true);
    })
  })
})
