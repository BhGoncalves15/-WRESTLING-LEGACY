package main

import (
	"flag"
	"fmt"
	"log"
	"net"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strings"
	"time"
)

const gamePath = "/-WRESTLING-LEGACY/"

func main() {
	lan := flag.Bool("rede", false, "Permitir acesso de outros aparelhos no mesmo Wi-Fi")
	headless := flag.Bool("sem-navegador", false, "Apenas iniciar o servidor local")
	flag.Parse()

	executable, err := os.Executable()
	if err != nil {
		log.Fatal(err)
	}
	root := filepath.Join(filepath.Dir(executable), strings.Trim(gamePath, "/"))
	if _, err := os.Stat(filepath.Join(root, "index.html")); err != nil {
		log.Fatal("Extraia todo o ZIP e mantenha a pasta -WRESTLING-LEGACY ao lado do iniciador.")
	}
	handler := gameHandler(root)
	host := "127.0.0.1"
	if *lan {
		host = "0.0.0.0"
	}
	listener, err := net.Listen("tcp4", net.JoinHostPort(host, "4173"))
	if err != nil {
		log.Fatal("A porta 4173 está ocupada. Feche a outra janela do jogo e tente novamente.")
	}
	const localURL = "http://localhost:4173" + gamePath
	fmt.Println("Wrestling Legacy · Carreira Livre")
	fmt.Println("PC:", localURL)
	if *lan {
		printNetworkAddresses()
	}
	fmt.Println("Mantenha esta janela aberta enquanto joga.")
	if !*headless {
		openBrowser(localURL)
	}
	server := &http.Server{Handler: handler, ReadHeaderTimeout: 5 * time.Second, IdleTimeout: 30 * time.Second}
	log.Fatal(server.Serve(listener))
}

func gameHandler(root string) http.Handler {
	files := http.StripPrefix(strings.TrimSuffix(gamePath, "/"), http.FileServer(http.Dir(root)))
	router := http.NewServeMux()
	router.Handle(gamePath, http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet && r.Method != http.MethodHead {
			w.Header().Set("Allow", "GET, HEAD")
			w.WriteHeader(http.StatusMethodNotAllowed)
			return
		}
		switch filepath.Ext(r.URL.Path) {
		case ".gz":
			// The browser unpacks the catalog after reading the gzip bytes.
			w.Header().Set("Content-Type", "application/gzip")
		case ".mp4":
			w.Header().Set("Content-Type", "video/mp4")
		}
		w.Header().Set("X-Content-Type-Options", "nosniff")
		files.ServeHTTP(w, r)
	}))
	return router
}

func printNetworkAddresses() {
	interfaces, err := net.Interfaces()
	if err != nil {
		return
	}
	for _, iface := range interfaces {
		if iface.Flags&net.FlagUp == 0 || iface.Flags&net.FlagLoopback != 0 {
			continue
		}
		addresses, _ := iface.Addrs()
		for _, address := range addresses {
			ip, _, err := net.ParseCIDR(address.String())
			if err == nil && ip.To4() != nil && ip.IsPrivate() {
				fmt.Println(iface.Name+" (celular):", "http://"+ip.String()+":4173"+gamePath)
			}
		}
	}
}

func openBrowser(url string) {
	var cmd *exec.Cmd
	switch runtime.GOOS {
	case "windows":
		cmd = exec.Command("rundll32.exe", "url.dll,FileProtocolHandler", url)
	case "darwin":
		cmd = exec.Command("open", url)
	default:
		cmd = exec.Command("xdg-open", url)
	}
	go func() {
		if err := cmd.Run(); err != nil {
			fmt.Println("Abra no navegador:", url)
		}
	}()
}
