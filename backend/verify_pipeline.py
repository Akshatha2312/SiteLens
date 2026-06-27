import requests

base = 'http://127.0.0.1:8000'

def post(path, payload=None):
    r = requests.post(base + path, json=payload, timeout=300)
    print(path, r.status_code)
    print(r.text[:1500])
    return r

post('/crawl', {'url': 'https://en.wikipedia.org/wiki/Coimbatore'})
post('/process')
post('/embed')
post('/index')
post('/search', {'query': 'Coimbatore'})
post('/ask', {'question': 'Where is Coimbatore located?'})
