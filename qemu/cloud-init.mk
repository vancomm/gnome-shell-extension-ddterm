# Generate SSH key pair and cloud-init config disk
# Requires `cloud-utils` or `cloud-image-utils` package (`cloud-localds`, `write-mime-multipart`)

VM_CONFIG_DISK := cloud-init/config.img
VM_SSH_KEY := ssh/id_rsa

ssh cloud-init:
	mkdir -p $@

$(VM_SSH_KEY): | ssh
	ssh-keygen -t rsa -f $@ -N ''

ssh/id_rsa.pub: $(VM_SSH_KEY)

ssh/clean:
	$(RM) $(VM_SSH_KEY) ssh/id_rsa.pub

cloud-init/ssh-config.yml: ssh/id_rsa.pub | cloud-init
	echo -e "#cloud-config\nssh_authorized_keys:\n  - $$(cat $<)" > $@

cloud-init/user-data: cloud-config.yml cloud-init/ssh-config.yml | cloud-init
	write-mime-multipart -o $@ $^

$(VM_CONFIG_DISK): cloud-init/user-data
	cloud-localds $@ $^

cloud-init/clean:
	$(RM) $(VM_CONFIG_DISK) cloud-init/ssh-config.yml cloud-init/user-data

clean: ssh/clean cloud-init/clean
.PHONY: ssh/clean cloud-init/clean

all: $(VM_CONFIG_DISK)
