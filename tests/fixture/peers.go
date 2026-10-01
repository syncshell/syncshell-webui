package main

import (
	"context"
	"os"
	"path/filepath"
	"strconv"
	"strings"
)

func configurePeers(ctx context.Context, primary, peer *testDaemon) error {
	for _, pair := range [][2]*testDaemon{{primary, peer}, {peer, primary}} {
		d, other := pair[0], pair[1]
		var config, device, folder map[string]any
		if err := d.api(ctx, "GET", "config", nil, &config); err != nil {
			return err
		}
		if err := d.api(ctx, "GET", "config/defaults/device", nil, &device); err != nil {
			return err
		}
		if err := d.api(ctx, "GET", "config/defaults/folder", nil, &folder); err != nil {
			return err
		}
		port, _ := strconv.Atoi(strings.TrimPrefix(other.address, "127.0.0.1:"))
		device["deviceID"], device["name"], device["addresses"] = other.id, filepath.Base(other.root), []string{"tcp://127.0.0.1:" + strconv.Itoa(port+10)}
		devices := config["devices"].([]any)
		for _, value := range devices {
			value.(map[string]any)["name"] = filepath.Base(d.root)
		}
		config["devices"] = append(devices, device)
		files := filepath.Join(d.root, "files")
		if err := os.MkdirAll(files, 0700); err != nil {
			return err
		}
		folder["id"], folder["label"], folder["path"] = "test-folder", "Test folder", files
		folder["fsWatcherEnabled"], folder["rescanIntervalS"] = false, 3600
		folder["devices"] = []map[string]string{{"deviceID": d.id}, {"deviceID": other.id}}
		config["folders"] = []any{folder}
		if err := d.api(ctx, "PUT", "config", config, nil); err != nil {
			return err
		}
	}
	return nil
}
