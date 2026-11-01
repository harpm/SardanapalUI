package main

import (
	"encoding/json"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
)

type PackageInfo struct {
	Name         string
	Path         string
	Publish_Path string
	Depends_On   []string
}

type BuildInfo struct {
	Version          string
	Registry         string
	Install_Registry string
	Repository       string
	Packages         []PackageInfo
}

type LogLevel int

const (
	Info_Level LogLevel = iota
	Debug_Level
	Warning_Level
	Error_Level
)

func Log(content string, level LogLevel) {

	if level == Debug_Level {
		fmt.Printf("\nLog [Debug]: %s\n", content)
	} else if level == Info_Level {
		fmt.Printf("\nLog [Info]: %s\n", content)
	} else if level == Warning_Level {
		fmt.Printf("\nLog [Warning]: %s\n", content)
	} else if level == Error_Level {
		fmt.Printf("\nLog [Error]: %s\n", content)
	}
}

func run(name string, args ...string) error {
	cmd := exec.Command(name, args...)
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	cmd.Env = os.Environ()
	return cmd.Run()
}

func runIn(dir string, name string, args ...string) error {
	cmd := exec.Command(name, args...)
	cmd.Dir = dir
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	cmd.Env = os.Environ()
	return cmd.Run()
}

func copyPublishNpmrc(publishPath string) error {
	if publishPath == "" || publishPath == "." {
		return nil
	}

	src, err := os.ReadFile(".npmrc")
	if err != nil {
		return err
	}

	return os.WriteFile(filepath.Join(publishPath, ".npmrc"), src, 0644)
}

func stampPackage(pkg PackageInfo, version string, repository string) error {
	manifestPath := filepath.Join(pkg.Path, "package.json")
	raw, err := os.ReadFile(manifestPath)
	if err != nil {
		return err
	}

	var manifest map[string]interface{}
	if err := json.Unmarshal(raw, &manifest); err != nil {
		return err
	}

	manifest["version"] = version
	manifest["repository"] = repository

	if len(pkg.Depends_On) > 0 {
		deps, _ := manifest["dependencies"].(map[string]interface{})
		if deps == nil {
			deps = map[string]interface{}{}
			manifest["dependencies"] = deps
		}
		for _, name := range pkg.Depends_On {
			deps[name] = version
		}
	}

	stamped, err := json.MarshalIndent(manifest, "", "  ")
	if err != nil {
		return err
	}

	return os.WriteFile(manifestPath, append(stamped, '\n'), 0644)
}

func packageVersionExists(name string, version string, registry string) bool {
	cmd := exec.Command("npm", "view", name+"@"+version, "version", "--registry", registry)
	cmd.Env = os.Environ()
	output, err := cmd.Output()
	if err != nil {
		return false
	}

	return strings.TrimSpace(string(output)) == version
}

func main() {

	var data BuildInfo
	b_data, err := os.ReadFile("Build.json")
	if err != nil {
		panic(err)
	}

	err = json.Unmarshal(b_data, &data)
	if err != nil {
		panic(err)
	}

	Log(fmt.Sprintf("Version: %s", data.Version), Info_Level)
	Log(fmt.Sprintf("Registry: %s", data.Registry), Info_Level)

	Log("Installing dependencies...", Info_Level)
	err = run("npm", "ci", "--registry", data.Install_Registry)
	if err != nil {
		Log(fmt.Sprintf("Install failed: %s", err), Error_Level)
		panic(err)
	}

	Log("Running tests...", Info_Level)
	err = run("npm", "test")
	if err != nil {
		Log(fmt.Sprintf("Tests failed: %s", err), Error_Level)
		panic(err)
	}

	for i := 0; i < len(data.Packages); i++ {
		pkg := data.Packages[i]
		Log(fmt.Sprintf("Stamping %s at %s", pkg.Name, data.Version), Info_Level)
		err = stampPackage(pkg, data.Version, data.Repository)
		if err != nil {
			Log(fmt.Sprintf("Failed to stamp %s: %s", pkg.Name, err), Error_Level)
			panic(err)
		}
	}

	Log("Building packages...", Info_Level)
	err = run("npm", "run", "build")
	if err != nil {
		Log(fmt.Sprintf("Build failed: %s", err), Error_Level)
		panic(err)
	}

	if os.Getenv("NODE_AUTH_TOKEN") == "" {
		Log("NODE_AUTH_TOKEN is not set", Error_Level)
		panic("NODE_AUTH_TOKEN is not set")
	}

	for i := 0; i < len(data.Packages); i++ {
		pkg := data.Packages[i]
		Log(fmt.Sprintf("-------------------- Started publish for package: %s --------------------", pkg.Name), Info_Level)

		if packageVersionExists(pkg.Name, data.Version, data.Registry) {
			Log(fmt.Sprintf("Skipping %s@%s; already published", pkg.Name, data.Version), Info_Level)
			Log(fmt.Sprintf("-------------------- Ended publish for package: %s --------------------", pkg.Name), Info_Level)
			continue
		}

		Log(fmt.Sprintf("Publishing %s from %s", pkg.Name, pkg.Publish_Path), Info_Level)
		err = copyPublishNpmrc(pkg.Publish_Path)
		if err != nil {
			Log(fmt.Sprintf("Failed to copy .npmrc into %s: %s", pkg.Publish_Path, err), Error_Level)
			panic(err)
		}

		err = runIn(pkg.Publish_Path, "npm", "publish", "--registry", data.Registry, "--ignore-scripts")
		if err != nil {
			Log(fmt.Sprintf("Failed to publish %s: %s", pkg.Name, err), Error_Level)
			panic(err)
		}

		Log(fmt.Sprintf("-------------------- Ended publish for package: %s --------------------", pkg.Name), Info_Level)
	}
}
