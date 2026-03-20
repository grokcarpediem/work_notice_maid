.PHONY: build dmg server clean

build:
	CGO_LDFLAGS="-framework UniformTypeIdentifiers" CGO_ENABLED=1 \
	go build -tags "desktop,production" -ldflags="-s -w" -o notice_maid .

dmg:
	bash build_dmg.sh

server:
	./notice_maid --server

clean:
	rm -f notice_maid
	rm -rf build
	go clean -cache
