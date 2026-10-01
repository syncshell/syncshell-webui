package main

import (
	"encoding/xml"
	"testing"
)

func TestFixtureConfigIsolatesGeneratedDefaults(t *testing.T) {
	data := []byte(`<configuration version="37"><folder id="default" path="/unwanted"/><device id="self"/><gui tls="false"><address>127.0.0.1:8384</address><apikey>fixture-key</apikey><theme>default</theme></gui><options><listenAddress>default</listenAddress><globalAnnounceEnabled>true</globalAnnounceEnabled><localAnnounceEnabled>true</localAnnounceEnabled><relaysEnabled>true</relaysEnabled><natEnabled>true</natEnabled><urAccepted>0</urAccepted><unrelated>retain</unrelated></options></configuration>`)
	result, err := fixtureConfig(data, "127.0.0.1:18401", "tcp://127.0.0.1:18411", "syncshell-modern")
	if err != nil {
		t.Fatal(err)
	}
	var config struct {
		Folders []struct{} `xml:"folder"`
		Device  struct {
			ID string `xml:"id,attr"`
		} `xml:"device"`
		GUI struct {
			Address string `xml:"address"`
			Key     string `xml:"apikey"`
			Theme   string `xml:"theme"`
		} `xml:"gui"`
		Options struct {
			ListenAddress         string `xml:"listenAddress"`
			GlobalAnnounceEnabled bool   `xml:"globalAnnounceEnabled"`
			LocalAnnounceEnabled  bool   `xml:"localAnnounceEnabled"`
			RelaysEnabled         bool   `xml:"relaysEnabled"`
			NATEnabled            bool   `xml:"natEnabled"`
			StartBrowser          bool   `xml:"startBrowser"`
			URAccepted            int    `xml:"urAccepted"`
			Unrelated             string `xml:"unrelated"`
		} `xml:"options"`
	}
	if err := xml.Unmarshal(result, &config); err != nil {
		t.Fatal(err)
	}
	t.Run("removes generated folders", func(t *testing.T) {
		if len(config.Folders) != 0 {
			t.Fatalf("got %d generated folders", len(config.Folders))
		}
	})
	t.Run("preserves device and unrelated values", func(t *testing.T) {
		if config.Device.ID != "self" || config.GUI.Key != "fixture-key" || config.Options.Unrelated != "retain" {
			t.Fatal("fixture changed preserved configuration")
		}
	})
	t.Run("sets isolated GUI and networking values", func(t *testing.T) {
		if config.GUI.Address != "127.0.0.1:18401" || config.GUI.Theme != "syncshell-modern" {
			t.Fatal("fixture did not set the isolated GUI")
		}
		if config.Options.ListenAddress != "tcp://127.0.0.1:18411" || config.Options.GlobalAnnounceEnabled || config.Options.LocalAnnounceEnabled || config.Options.RelaysEnabled || config.Options.NATEnabled {
			t.Fatal("fixture retained external networking")
		}
	})
	t.Run("disables browser launch and usage reporting", func(t *testing.T) {
		if config.Options.StartBrowser || config.Options.URAccepted != -1 {
			t.Fatal("fixture retained browser launch or usage reporting")
		}
	})
}
