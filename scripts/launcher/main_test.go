package main

import (
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"testing"
)

func TestServesGameAndSeekableVideo(t *testing.T) {
	root := t.TempDir()
	files := map[string]string{"index.html": "<title>Wrestling Legacy</title>", "catalog.gz": "catalog", "demo.mp4": "0123456789"}
	for name, body := range files {
		if err := os.WriteFile(filepath.Join(root, name), []byte(body), 0600); err != nil {
			t.Fatal(err)
		}
	}
	handler := gameHandler(root)
	cases := []struct {
		path, byteRange, mediaType, body string
		status                           int
	}{
		{gamePath, "", "text/html; charset=utf-8", files["index.html"], 200},
		{gamePath + "catalog.gz", "", "application/gzip", "catalog", 200},
		{gamePath + "demo.mp4", "bytes=1-4", "video/mp4", "1234", 206},
	}
	for _, test := range cases {
		request := httptest.NewRequest(http.MethodGet, test.path, nil)
		request.Header.Set("Range", test.byteRange)
		recorder := httptest.NewRecorder()
		handler.ServeHTTP(recorder, request)
		if recorder.Code != test.status || recorder.Header().Get("Content-Type") != test.mediaType ||
			recorder.Header().Get("Content-Encoding") != "" || recorder.Body.String() != test.body {
			t.Fatalf("%s: %d %v %q", test.path, recorder.Code, recorder.Header(), recorder.Body.String())
		}
	}
}
