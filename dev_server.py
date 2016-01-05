import SimpleHTTPServer, SocketServer
import urlparse
import os

PORT = 8000


class MyHandler(SimpleHTTPServer.SimpleHTTPRequestHandler):
    """
    Used for development. Redirect all not found request to index.html
    Run it in the 'public' directory.

        Projects/qrsn/public$ python ../dev_server.py

    """

    def do_GET(self):

        # Parse query data to find out what was requested
        parsed_params = urlparse.urlparse(self.path)

        # See if the file requested exists
        if os.access('.' + os.sep + parsed_params.path, os.R_OK):
            # File exists, serve it up
            SimpleHTTPServer.SimpleHTTPRequestHandler.do_GET(self);
        else:
            # send index.hmtl
            self.send_response(200)
            self.send_header('Content-Type', 'text/html')
            self.end_headers()
            with open('index.html', 'r') as fin:
                self.copyfile(fin, self.wfile)


Handler = MyHandler

httpd = SocketServer.TCPServer(("", PORT), Handler)

print "serving at port", PORT
httpd.serve_forever()