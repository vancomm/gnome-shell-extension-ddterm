# Inputs:
# VM_NAME
# VM_IMAGE_URL (download.mk)
# VM_IMAGE_CHECKSUM_URL (download.mk)
# VM_DOWNLOAD_COMMAND (download.mk)
# VM_QEMU
# VM_QEMU_OPTIONS
# VM_CREATE_DISK_SIZE
# VM_CREATE_DISK_OPTIONS
# VM_SSH_KEY
# VM_CONFIG_DISK

include download.mk

VM_WORK_DIR := vms/$(VM_NAME)
VM_WORK_DIR_UP := ../..

VM_DISK := $(VM_WORK_DIR)/disk.img
VM_PID_FILE := $(VM_WORK_DIR)/pid
VM_SSH_ENDPOINT := $(VM_WORK_DIR)/ssh_endpoint
VM_SSH_CONFIG := $(VM_WORK_DIR)/ssh_config
VM_ANSIBLE_INVENTORY := $(VM_WORK_DIR)/inventory
VM_SSH_ONLINE_STAMP := $(VM_WORK_DIR)/ssh-online
VM_PREPARED_STAMP := $(VM_WORK_DIR)/prepared
VM_MONITOR_SOCK := $(VM_WORK_DIR)/monitor.sock

VM_FILES := \
	$(VM_DISK) \
	$(VM_PID_FILE) \
	$(VM_SSH_ENDPOINT) \
	$(VM_SSH_CONFIG) \
	$(VM_ANSIBLE_INVENTORY) \
	$(VM_SSH_ONLINE_STAMP) \
	$(VM_PREPARED_STAMP) \
	$(VM_MONITOR_SOCK)

VM_TARGETS := $(VM_NAME) $(VM_NAME)/deploy $(VM_NAME)/ssh $(VM_NAME)/clean
.PHONY: $(VM_TARGETS)

$(VM_FILES) $(VM_TARGETS): VM_NAME := $(VM_NAME)

$(VM_NAME)/clean:
	$(RM) $(VM_FILES)

$(VM_NAME)/clean: VM_FILES := $(VM_FILES)

clean $(VM_NAME)/distclean: $(VM_NAME)/clean

$(VM_WORK_DIR):
	mkdir -p $@

$(VM_FILES): | $(VM_WORK_DIR)

$(VM_DISK): $(VM_IMAGE_FILE) | $(VM_IMAGE_CHECKSUM_STAMP)
	$(RM) $@
	$(VM_QEMU_IMG_COMMAND)

$(VM_DISK): VM_QEMU_IMG_COMMAND := \
	qemu-img create \
		-f qcow2 \
		-b $(VM_WORK_DIR_UP)/$(VM_IMAGE_FILE) \
		-F qcow2 \
		-o $(VM_CREATE_DISK_OPTIONS) \
		$(VM_DISK) $(VM_CREATE_DISK_SIZE)

all: $(VM_DISK)

$(VM_PID_FILE): $(VM_CONFIG_DISK) $(VM_IMAGE_FILE) | $(VM_DISK)
	$(VM_COMMAND_LINE)

$(VM_PID_FILE): VM_COMMAND_LINE := \
	$(VM_QEMU) \
	-pidfile $(VM_PID_FILE) \
	-daemonize \
	-name $(VM_NAME) \
	-drive 'file=$(VM_DISK),if=virtio,discard=on,detect-zeroes=unmap' \
	-drive 'driver=raw,file=$(VM_CONFIG_DISK),if=virtio,read-only=on' \
	-smbios 'type=1,serial=ds=nocloud;h=$(VM_NAME);i=$(VM_NAME)' \
	-nic user,model=virtio-net-pci,hostfwd=tcp:127.0.0.1:0-:22 \
	-monitor unix:$(VM_MONITOR_SOCK),server=on,wait=off \
	$(VM_QEMU_OPTIONS)

$(VM_MONITOR_SOCK): | $(VM_PID_FILE)

$(VM_SSH_ENDPOINT): $(VM_MONITOR_SOCK) get-hostfwd-endpoint.expect $(VM_PID_FILE)
	./get-hostfwd-endpoint.expect $< 127.0.0.1 22 >$@

$(VM_SSH_CONFIG) $(VM_ANSIBLE_INVENTORY): VM_SSH_KEY := $(VM_SSH_KEY)
$(VM_SSH_CONFIG) $(VM_ANSIBLE_INVENTORY): $(VM_SSH_ENDPOINT)
$(VM_SSH_CONFIG) $(VM_ANSIBLE_INVENTORY): VM_SSH_HOST_PORT = $(shell cat $<)

$(VM_SSH_CONFIG):
	( \
		echo Host $(VM_NAME); \
		echo HostName $(firstword $(VM_SSH_HOST_PORT)); \
		echo Port $(lastword $(VM_SSH_HOST_PORT)); \
		echo IdentityFile $(VM_SSH_KEY); \
		echo User ddterm; \
		echo StrictHostKeyChecking no; \
		echo UserKnownHostsFile /dev/null; \
	) >$@

$(VM_ANSIBLE_INVENTORY):
	echo $(VM_NAME) \
		ansible_host=$(firstword $(VM_SSH_HOST_PORT)) \
		ansible_port=$(lastword $(VM_SSH_HOST_PORT)) \
		ansible_user=ddterm \
		ansible_ssh_private_key_file=$(VM_SSH_KEY) \
		ansible_ssh_host_key_checking=no \
		"ansible_ssh_common_args='-o UserKnownHostsFile=/dev/null'" >$@

$(VM_SSH_ONLINE_STAMP): $(VM_SSH_CONFIG)
	@echo Waiting for SSH connection
	ssh -F $< -o ConnectTimeout=180 -o ConnectionAttempts=10 $(VM_NAME) true
	touch $@

$(VM_PREPARED_STAMP): $(VM_ANSIBLE_INVENTORY) $(VM_SSH_ONLINE_STAMP) ansible/prepare*.yml
	ansible-playbook -i $< ansible/prepare.yml
	touch $@

$(VM_NAME)/deploy: $(VM_ANSIBLE_INVENTORY) $(VM_PREPARED_STAMP)
	ansible-playbook -i $< ansible/deploy.yml

$(VM_NAME): $(VM_NAME)/deploy

$(VM_NAME)/ssh: $(VM_SSH_CONFIG) $(VM_SSH_ONLINE_STAMP)
	ssh -F $< $(VM_NAME)
