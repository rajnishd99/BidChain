# BidChain — top-level Makefile
# Run `make help` for the full list of targets.

-include .env
export

NETWORK ?= testnet
RPC_URL ?= https://soroban-testnet.stellar.org
NETWORK_PASSPHRASE ?= Test SDF Network ; September 2015
SOURCE ?= deployer
WASM_PATH := target/wasm32v1-none/release/auction.wasm
ABI_PATH  := abi/auction.abi.json
DEPLOYMENTS_PATH := deployments/$(NETWORK).json

.PHONY: help identity install build test fmt clean optimize deploy invoke bind abi frontend-dev frontend

help:
	@echo "BidChain targets:"
	@echo "  make identity    - create a '$(SOURCE)' identity if missing, then fund on $(NETWORK)"
	@echo "  make install     - install Node deps"
	@echo "  make build       - build the Soroban contract WASM"
	@echo "  make test        - run the Soroban contract tests"
	@echo "  make fmt         - cargo fmt the contracts"
	@echo "  make optimize    - build with --optimize (smaller WASM)"
	@echo "  make deploy      - deploy to $(NETWORK) and write ABI"
	@echo "  make invoke FN=create_auction ARGS='--seller ...' - invoke a contract function"
	@echo "  make bind        - regenerate the TS bindings from the deployed WASM"
	@echo "  make abi         - dump the JSON ABI"
	@echo "  make frontend-dev - run the Next.js dev server"
	@echo "  make frontend    - build the Next.js app"

identity:
	@if ! stellar keys ls 2>/dev/null | grep -q '^$(SOURCE)$$'; then \
	  stellar keys generate $(SOURCE); \
	fi
	stellar keys fund $(SOURCE) --network $(NETWORK) || true

install:
	pnpm install

build:
	cd contracts && stellar contract build

test:
	cd contracts && cargo test

fmt:
	cd contracts && cargo fmt --all

clean:
	cd contracts && cargo clean

optimize:
	cd contracts && stellar contract build --optimize

deploy: build
	pnpm tsx scripts/deploy.ts

invoke:
	stellar contract invoke --id $$CONTRACT_ID --source $(SOURCE) --network $(NETWORK) --rpc-url $(RPC_URL) --network-passphrase "$(NETWORK_PASSPHRASE)" --send=yes -- $(FN) $(ARGS)

bind:
	pnpm tsx scripts/bind.ts

abi:
	@mkdir -p abi
	stellar contract info interface --wasm $(WASM_PATH) --output json > $(ABI_PATH)
	@echo "ABI written to $(ABI_PATH)"

frontend-dev:
	pnpm dev

frontend:
	pnpm build
