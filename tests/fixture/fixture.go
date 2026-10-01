package main

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
)

func runFixture(ctx context.Context, root, assets string, port int) error {
	if err := os.Mkdir(root, 0700); err != nil {
		return err
	}
	primary, err := startTestDaemon(ctx, filepath.Join(root, "primary"), assets, port)
	if err != nil {
		return err
	}
	defer primary.stop()
	peer, err := startTestDaemon(ctx, filepath.Join(root, "peer"), "", port+1)
	if err != nil {
		return err
	}
	defer peer.stop()
	if err := configurePeers(ctx, primary, peer); err != nil {
		return err
	}
	ready, _ := json.Marshal(map[string]string{"url": "http://" + primary.address, "runtime": primary.root, "peer": "http://" + peer.address})
	if err := os.WriteFile(filepath.Join(root, "ready.json"), ready, 0600); err != nil {
		return err
	}
	fmt.Println("test frontend ready at http://" + primary.address)
	<-ctx.Done()
	return nil
}
