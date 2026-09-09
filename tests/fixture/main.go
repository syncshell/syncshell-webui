package main

import (
	"context"
	"flag"
	"log"
	"os"
	"os/signal"
	"syscall"
)

func main() {
	runtime := flag.String("runtime", "", "new disposable runtime directory")
	assets := flag.String("fixture-assets", "", "compiled syncshell-modern directory")
	port := flag.Int("fixture-port", 18401, "primary fixture GUI port")
	flag.Parse()
	if *runtime == "" || *assets == "" {
		log.Fatal("runtime and fixture-assets are required")
	}
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()
	if err := runFixture(ctx, *runtime, *assets, *port); err != nil {
		log.Fatal(err)
	}
}
