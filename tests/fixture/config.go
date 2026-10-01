package main

import (
	"bytes"
	"encoding/xml"
	"io"
	"strings"
)

func fixtureConfig(data []byte, address, syncAddress, theme string) ([]byte, error) {
	values := map[string]string{
		"configuration/gui/theme":                     theme,
		"configuration/gui/address":                   address,
		"configuration/options/listenAddress":         syncAddress,
		"configuration/options/globalAnnounceEnabled": "false",
		"configuration/options/localAnnounceEnabled":  "false",
		"configuration/options/relaysEnabled":         "false",
		"configuration/options/natEnabled":            "false",
		"configuration/options/startBrowser":          "false",
		"configuration/options/urAccepted":            "-1",
	}
	decoder := xml.NewDecoder(bytes.NewReader(data))
	var buffer bytes.Buffer
	encoder := xml.NewEncoder(&buffer)
	var stack []string
	for {
		token, err := decoder.Token()
		if err == io.EOF {
			break
		}
		if err != nil {
			return nil, err
		}
		switch value := token.(type) {
		case xml.StartElement:
			if len(stack) == 1 && value.Name.Local == "folder" {
				if err := decoder.Skip(); err != nil {
					return nil, err
				}
				continue
			}
			stack = append(stack, value.Name.Local)
			if err := encoder.EncodeToken(token); err != nil {
				return nil, err
			}
			if replacement, ok := values[strings.Join(stack, "/")]; ok {
				if err := encoder.EncodeToken(xml.CharData(replacement)); err != nil {
					return nil, err
				}
			}
			continue
		case xml.EndElement:
			stack = stack[:len(stack)-1]
		case xml.CharData:
			if _, ok := values[strings.Join(stack, "/")]; ok {
				continue
			}
		}
		if err := encoder.EncodeToken(token); err != nil {
			return nil, err
		}
	}
	if err := encoder.Flush(); err != nil {
		return nil, err
	}
	return buffer.Bytes(), nil
}
