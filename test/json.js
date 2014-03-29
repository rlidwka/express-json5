var connect = require('connect');
var assert = require('assert');
var request = require('supertest');

var express_json5 = require('..');

var app = connect();

app.use(express_json5({ limit: '1mb' }));

app.use(function(req, res){
  res.end(JSON.stringify(req.body));
});

app.use(function(err, req, res, next){
  res.statusCode = err.status;
  res.end(err.message);
});

describe('express_json5()#json', function(){
  it('should parse JSON', function(done){
    request(app)
    .post('/')
    .set('Content-Type', 'application/json')
    .send('{"user":"tobi"}')
    .end(function(err, res){
      res.text.should.equal('{"user":"tobi"}');
      done();
    });
  })

  it('should fail gracefully', function(done){
    request(app)
    .post('/')
    .set('Content-Type', 'application/json')
    .send('{"user"')
    .end(function(err, res){
      res.text.should.equal('Unexpected end of input at 1:8\n{"user"\n       ^');
      done();
    });
  })

  it('should handle Content-Length: 0', function(done){
    var app = connect();
    app.use(express_json5());

    app.use(function(req, res){
      res.end(Object.keys(req.body).length ? '' : 'empty');
    });

    request(app)
    .get('/')
    .set('Content-Type', 'application/json')
    .set('Content-Length', '0')
    .end(function(err, res){
      res.should.have.status(200);
      res.text.should.equal('empty');
      done();
    });
  })

  it('should 400 on malformed JSON', function(done){
    var app = connect();
    app.use(express_json5());

    app.use(function(req, res){
      res.end(JSON.stringify(req.body));
    });

    request(app)
    .post('/')
    .set('Content-Type', 'application/json')
    .send('{"foo')
    .expect(400, done);
  })

  it('should 400 when no body is given', function(done){
    var app = connect();
    app.use(express_json5());

    app.use(function(req, res){
      res.end(JSON.stringify(req.body));
    });

    request(app)
    .post('/')
    .set('Content-Type', 'application/json')
    .end(function(err, res){
      res.should.have.status(400);
      res.text.should.include("invalid json, empty body");
      done();
    })
  })

  it('should support all http methods', function(done){
    var app = connect();
    app.use(express_json5());

    app.use(function(req, res){
      res.end(JSON.stringify(req.body));
    });

    request(app)
    .get('/')
    .set('Content-Type', 'application/json')
    .set('Content-Length', '["foo"]'.length)
    .send('["foo"]')
    .expect('["foo"]', done);
  })

  describe('when strict is false', function(){
    it('should parse primitives', function(done){
      var app = connect();
      app.use(express_json5({ strict: false }));

      app.use(function(req, res){
        res.end(JSON.stringify(req.body));
      });

      request(app)
      .post('/')
      .set('Content-Type', 'application/json')
      .send('true')
      .expect('true', done);
    })
  })

  describe('when strict is true', function(){
    it('should not parse primitives', function(done){
      var app = connect();
      app.use(express_json5({ strict: true }));

      app.use(function(req, res){
        res.end(JSON.stringify(req.body));
      });

      request(app)
      .post('/')
      .set('Content-Type', 'application/json')
      .send('true')
      .end(function(err, res){
        res.should.have.status(400);
        res.text.should.include('invalid json');
        done();
      });
    })

    it('should allow leading whitespaces in JSON', function(done){
      var app = connect();
      app.use(express_json5({ strict: true }));

      app.use(function(req, res){
        res.end(JSON.stringify(req.body));
      });

      request(app)
      .post('/')
      .set('Content-Type', 'application/json')
      .send('   { "user": "tobi" }')
      .end(function(err, res){
        res.should.have.status(200);
        res.text.should.include('{"user":"tobi"}');
        done();
      });
    })
  })

  describe('by default', function(){
    it('should 400 on primitives', function(done){
      var app = connect();
      app.use(express_json5());

      app.use(function(req, res){
        res.end(JSON.stringify(req.body));
      });

      request(app)
      .post('/')
      .set('Content-Type', 'application/json')
      .send('true')
      .expect(400, done);
    })
  })

  it('should support utf-8', function(done){
    var app = connect();

    app.use(express_json5());

    app.use(function(req, res, next){
      res.end(req.body.name);
    });

    request(app)
    .post('/')
    .set('Content-Type', 'application/json; charset=utf-8')
    .send('{"name":"论"}')
    .expect('论', done);
  })

  it('should support {"test":"å"}', function (done) {
    // https://github.com/visionmedia/express/issues/1816

    var app = connect();
    app.use(express_json5());
    app.use(function(req, res, next){
      res.end(req.body.test);
    })

    request(app)
    .post('/')
    .set('Content-Type', 'application/json; charset=utf-8')
    .set('Content-Length', '13')
    .send('{"test":"å"}')
    .expect('å', done);
  })

  describe('the default json mime type regular expression', function() {
    var mimeRegExp = express_json5.regexp;
    it('should support the basic JSON mime type', function(){
      mimeRegExp.test('application/json').should.eql(true);
    })

    it('should not match incorrect mime type', function(){
      mimeRegExp.test('zapplication/json').should.eql(false);
    })

    it('should be case insensitive', function(){
      mimeRegExp.test('Application/JSON').should.eql(true);
    })

    it('should support suffix notation', function(){
      mimeRegExp.test('application/vnd.organization.prog-type.org+json').should.eql(true);
    })

    it('should support specific special characters on mime subtype', function(){
      mimeRegExp.test('application/vnd.organization.special_!#$%*`-^~.org+json').should.eql(true);
    })

    it('should not support other special characters on mime subtype', function(){
      mimeRegExp.test('application/vnd.organization.special_()<>@,;:\\"/[]?={} \t.org+json').should.eql(false);
    })

    it('should not match malformed mime subtype suffix', function(){
      mimeRegExp.test('application/vnd.test.org+json+xml').should.eql(false);
    })
  });

  if (!connect.utils.brokenPause) {
    it('should parse JSON with limit and after next tick', function(done){
      var app = connect();

      app.use(function(req, res, next) {
        setTimeout(next, 10);
      });

      app.use(express_json5({ limit: '1mb' }));

      app.use(function(req, res){
        res.end(JSON.stringify(req.body));
      });

      app.use(function(err, req, res, next){
        res.statusCode = err.status;
        res.end(err.message);
      });

      request(app)
      .post('/')
      .set('Content-Type', 'application/json')
      .send('{"user":"tobi"}')
      .end(function(err, res){
        res.text.should.equal('{"user":"tobi"}');
        done();
      });
    })
  }
})
