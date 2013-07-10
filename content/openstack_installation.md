---
title: OpenStack Installation
---
                       
##Contents 


1. Requirements

2. Getting Started

3. Keystone

4. Glance

5. Quantum

6. Nova

7. Cinder

8. Horizon

9. Your first VM 



##Requirements

|---
| Role Name | Description 
|:-|:-:|
| Node Role  | NICs|
| Single Node | eth0 (10.10.100.51),eth1 (10.42.0.51) |
|---

##Getting Started

###Preparing Ubuntu
   
*Note: On AMD machines create a volume-group called "cinder-volumes" while installing Ubuntu12.04 and for Intel machines create an empty partition which can later be used for creating a volume-group*

Enter into super user mode to execute commands:

```bash
$sudo su
```

Add Grizzly repositories:

```bash
#apt-get install ubuntu-cloud-keyring python-software-properties software-properties-common python-keyring
#echo deb http://ubuntu-cloud.archive.canonical.com/ubuntu precise-updates/grizzly main >> /etc/apt/sources.list.d/grizzly.list
```

Update your system:

```bash
#apt-get update
#apt-get upgrade
#apt-get dist-upgrade
```

###Networking

For OpenStack Single-Node setup we require 2 NIC's, One NIC (10.42.0.51) is used for external network connection i.e, Internet access and the other NIC (10.10.100.51) is used for internal networking (OpenStack management). 

Note: The external NIC should have a static IP address.

Edit network settings using the following command

```bash
#vi /etc/network/interfaces
    #For Exposing OpenStack API over the internet
    auto eth1
    iface eth1 inet static
    address 10.42.0.51
    netmask 255.255.255.0
    gateway 10.42.0.1
    dns-nameservers 8.8.8.8

    #Not internet connected(used for OpenStack management)
    auto eth0
    iface eth0 inet static
    address 10.10.100.51
    netmask 255.255.255.0
```


Restart the networking service:

```bash
#/etc/init.d/networking restart
```

###MySQL & RabbitMQ

**Install MySQL:**

```bash
#apt-get install -y mysql-server python-mysqldb
```

During the install, you'll be prompted for the mysql root password. Enter a password of your choice and verify it.

Configure mysql to accept all incoming requests:

```bash
#sed -i 's/127.0.0.1/0.0.0.0/g' /etc/mysql/my.cnf
#service mysql restart
```

**Install RabbitMQ (Message Queue):**

The OpenStack Cloud Controller communicates with other nova components such as `Scheduler`, `Network Controller`, and `Volume Controller` using `AMQP` (Advanced Message Queue Protocol). Nova components use Remote Procedure Calls (RPC) to communicate to one another.

```bash
#apt-get install -y rabbitmq-server
```

**Install NTP service (Network Time Protocol):**

To keep all the services in sync, you need to install NTP, and if you do a multi-node configuration you will configure one server to be the reference server.

```bash
#apt-get install -y ntp
```

###Others Services

```bash
#apt-get install -y vlan bridge-utils
```

Enable IP_Forwarding:

Enabling IP Forwarding makes the machine to act as a router or proxy server to share one internet connection to many client machines. 

```bash
#sed -i 's/#net.ipv4.ip_forward=1/net.ipv4.ip_forward=1/' /etc/sysctl.conf
```

To save you from rebooting, perform the following

```bash
#sysctl net.ipv4.ip_forward=1
```

##Keystone


Keystone is an identity service which supports various protocols for authentication and authorization 

Start by the keystone packages:

```bash
#apt-get install -y keystone
```

Verify your keystone is running:

```bash
#service keystone status
```

Create a new MySQL database for keystone:

```bash
    mysql -u root -p
    CREATE DATABASE keystone;
    GRANT ALL ON keystone.* TO 'keystoneUser'@'%' IDENTIFIED BY 'keystonePass';
    quit;
```

Adapt the connection attribute in the /etc/keystone/keystone.conf to the new database:

```bash
    connection = mysql://keystoneUser:keystonePass@10.10.100.51/keystone
```

Restart the identity service then synchronize the database:

```bash
#service keystone restart
#keystone-manage db_sync
```

Fill up the keystone database using the two scripts available in the Scripts folder of this git repository:

Modify the HOST_IP and HOST_IP_EXT variables before executing the scripts HOST_IP(10.10.100.51) and HOST_IP_EXT(10.42.0.51)

```bash
#wget https://raw.github.com/mseknibilel/OpenStack-Grizzly-Install-Guide/OVS_SingleNode/KeystoneScripts/keystone_basic.sh
#wget https://raw.github.com/mseknibilel/OpenStack-Grizzly-Install-Guide/OVS_SingleNode/KeystoneScripts/keystone_endpoints_basic.sh
#chmod +x keystone_basic.sh
#chmod +x keystone_endpoints_basic.sh
#./keystone_basic.sh
#./keystone_endpoints_basic.sh
```

Create a simple credential file and load it so you won't be bothered later:

```bash
#nano creds
#Paste the following:
    export OS_TENANT_NAME=admin
    export OS_USERNAME=admin
    export OS_PASSWORD=admin_pass
    export OS_AUTH_URL="http://10.42.0.51:5000/v2.0/"
```
Load it:

```bash
#source creds
```

To test Keystone, we use a simple CLI command:

```bash
#keystone user-list
```

##Glance

We Move now to Glance installation:

```bash
#apt-get install -y glance
```

Verify your glance services are running:

```bash
#service glance-api status
#service glance-registry status
```

Create a new MySQL database for Glance:

```bash
    mysql -u root -p
    CREATE DATABASE glance;
    GRANT ALL ON glance.* TO 'glanceUser'@'%' IDENTIFIED BY 'glancePass';
    quit;
```

Update /etc/glance/glance-api-paste.ini with:

```bash

    [filter:authtoken]
    paste.filter_factory = keystoneclient.middleware.auth_token:filter_factory
    delay_auth_decision = true
    auth_host = 10.10.100.51
    auth_port = 35357
    auth_protocol = http
    admin_tenant_name = service
    admin_user = glance
    admin_password = service_pass
```

Update the /etc/glance/glance-registry-paste.ini with:

```bash
    [filter:authtoken]
    paste.filter_factory = keystoneclient.middleware.auth_token:filter_factory
    auth_host = 10.10.100.51
    auth_port = 35357
    auth_protocol = http
    admin_tenant_name = service
    admin_user = glance
    admin_password = service_pass
```

Update /etc/glance/glance-api.conf with:

```bash
    sql_connection = mysql://glanceUser:glancePass@10.10.100.51/glance
    And:
    [paste_deploy]
    flavor = keystone
```

Update the /etc/glance/glance-registry.conf with:

```bash
    sql_connection = mysql://glanceUser:glancePass@10.10.100.51/glance
    And:
    [paste_deploy]
    flavor = keystone
```

Restart the glance-api and glance-registry services:

```bash
#service glance-api restart; service glance-registry restart
```

Synchronize the glance database:

```bash
#glance-manage db_sync
```

Restart the services again to take into account the new modifications:

```bash
#service glance-registry restart; service glance-api restart
```

To test Glance, upload the cirros cloud image directly from the internet:

```bash
#glance image-create --name myFirstImage --is-public true --container-format bare --disk-format qcow2 --location https://launchpad.net/    cirros/trunk/0.3.0/+download/cirros-0.3.0-x86_64-disk.img
```

Now list the image to see what you have just uploaded:

```bash
#glance image-list
```

##Quantum

###OpenVSwitch

**Install the openVSwitch:**

```bash
#apt-get install -y openvswitch-switch openvswitch-datapath-dkms
```

Create the bridges:

```bash
#br-int will be used for VM integration
#ovs-vsctl add-br br-int
```

br-ex is used to make to access the internet (not covered in this guide)

```bash
#ovs-vsctl add-br br-ex
```

This will guide you to setting up the br-ex interface. Edit the eth1 in /etc/network/interfaces to become like this:

```bash
# VM internet Access
    auto eth1
    iface eth1 inet manual
    up ifconfig $IFACE 0.0.0.0 up
    up ip link set $IFACE promisc on
    down ip link set $IFACE promisc off
    down ifconfig $IFACE down
```

Add the eth1 to the br-ex:

Internet connectivity will be lost after this step but this won't affect OpenStack's work

```bash
#ovs-vsctl add-port br-ex eth1
```

Optional, If you want to get internet connection back, you can assign the eth1's IP address to the br-ex in the /etc/network/interfaces file:

```bash
    auto br-ex
    iface br-ex inet static
    address 10.42.0.51
    netmask 255.255.255.0
    gateway 10.42.0.1
    dns-nameservers 8.8.8.8
```

###Quantum

Install the Quantum components:

```bash
#apt-get install -y quantum-server quantum-plugin-openvswitch quantum-plugin-openvswitch-agent dnsmasq quantum-dhcp-agent quantum-l3-agent
```

Create a database:

```bash
    mysql -u root -p
    CREATE DATABASE quantum;
    GRANT ALL ON quantum.* TO 'quantumUser'@'%' IDENTIFIED BY 'quantumPass';
    quit;
```

Verify all Quantum components are running:

```bash
#cd /etc/init.d/; for i in $( ls quantum-* ); do sudo service $i status; done
```

Edit /etc/quantum/api-paste.ini

```bash
    [filter:authtoken]
    paste.filter_factory = keystoneclient.middleware.auth_token:filter_factory
    auth_host = 10.10.100.51
    auth_port = 35357
    auth_protocol = http
    admin_tenant_name = service
    admin_user = quantum
    admin_password = service_pass
```

Edit the OVS plugin configuration file /etc/quantum/plugins/openvswitch/ovs_quantum_plugin.ini with::

Under the database section

```bash
    [DATABASE]
    sql_connection = mysql://quantumUser:quantumPass@10.10.100.51/quantum
```

Under the OVS section

```bash
    [OVS]
    tenant_network_type = gre
    tunnel_id_ranges = 1:1000
    integration_bridge = br-int
    tunnel_bridge = br-tun
    local_ip = 10.10.100.51
    enable_tunneling = True

    #Firewall driver for realizing quantum security group function
    [SECURITYGROUP]
    firewall_driver = quantum.agent.linux.iptables_firewall.OVSHybridIptablesFirewallDriver
```

Update /etc/quantum/metadata_agent.ini:

```bash
#The Quantum user information for accessing the Quantum API.
    auth_url = http://10.10.100.51:35357/v2.0
    auth_region = RegionOne
    admin_tenant_name = service
    admin_user = quantum
    admin_password = service_pass

#IP address used by Nova metadata server
    nova_metadata_ip = 127.0.0.1

#TCP Port used by Nova metadata server
    nova_metadata_port = 8775
    metadata_proxy_shared_secret = helloOpenStack
```

Edit your /etc/quantum/quantum.conf:

```bash
    [keystone_authtoken]
    auth_host = 10.10.100.51
    auth_port = 35357
    auth_protocol = http
    admin_tenant_name = service
    admin_user = quantum
    admin_password = service_pass
    signing_dir = /var/lib/quantum/keystone-signing
```

Restart all quantum services:

```bash
#cd /etc/init.d/; for i in $( ls quantum-* ); do sudo service $i restart; done
#service dnsmasq restart
```

##Nova

###KVM

Make sure that your hardware enables virtualization:

```bash
#apt-get install cpu-checker
#kvm-ok
```

Normally you would get a good response. Now, move to install kvm and configure it:

```bash
#apt-get install -y kvm libvirt-bin pm-utils
```

Edit the cgroup_device_acl array in the /etc/libvirt/qemu.conf file to:

```bash
    cgroup_device_acl = [
    "/dev/null", "/dev/full", "/dev/zero",
    "/dev/random", "/dev/urandom",
    "/dev/ptmx", "/dev/kvm", "/dev/kqemu",
    "/dev/rtc", "/dev/hpet","/dev/net/tun"
    ]
```

Delete default virtual bridge

```bash
#virsh net-destroy default
#virsh net-undefine default
```

Enable live migration by updating /etc/libvirt/libvirtd.conf file:

```bash
    listen_tls = 0
    listen_tcp = 1
    auth_tcp = "none"
```

Edit libvirtd_opts variable in /etc/init/libvirt-bin.conf file:

```bash
    env libvirtd_opts="-d -l"
```

Edit /etc/default/libvirt-bin file

```bash
    libvirtd_opts="-d -l"
```

Restart the libvirt service and dbus to load the new values:

```bash
#service dbus restart && service libvirt-bin restart
```

##Nova

Start by installing nova components:

```bash
#apt-get install -y nova-api nova-cert novnc nova-consoleauth nova-scheduler nova-novncproxy nova-doc nova-conductor nova-compute-kvm
```
Check the status of all nova-services:

```bash
#cd /etc/init.d/; for i in $( ls nova-* ); do service $i status; cd; done
```

Prepare a Mysql database for Nova:

```bash
    mysql -u root -p
    CREATE DATABASE nova;
    GRANT ALL ON nova.* TO 'novaUser'@'%' IDENTIFIED BY 'novaPass';
    quit;
```

Now modify authtoken section in the /etc/nova/api-paste.ini file to this:

```bash
    [filter:authtoken]
    paste.filter_factory = keystoneclient.middleware.auth_token:filter_factory
    auth_host = 10.10.100.51
    auth_port = 35357
    auth_protocol = http
    admin_tenant_name = service
    admin_user = nova
    admin_password = service_pass
    signing_dirname = /tmp/keystone-signing-nova
    # Workaround for https://bugs.launchpad.net/nova/+bug/1154809
    auth_version = v2.0
```

Modify the /etc/nova/nova.conf like this:

```bash
    [DEFAULT]
    logdir=/var/log/nova
    state_path=/var/lib/nova
    lock_path=/run/lock/nova
    verbose=True
    api_paste_config=/etc/nova/api-paste.ini
    compute_scheduler_driver=nova.scheduler.simple.SimpleScheduler
    rabbit_host=10.10.100.51
    nova_url=http://10.10.100.51:8774/v1.1/
    sql_connection=mysql://novaUser:novaPass@10.10.100.51/nova
    root_helper=sudo nova-rootwrap /etc/nova/rootwrap.conf

    # Auth
    use_deprecated_auth=false
    auth_strategy=keystone

    # Imaging service
    glance_api_servers=10.10.100.51:9292
    image_service=nova.image.glance.GlanceImageService

    # Vnc configuration
    novnc_enabled=true
    novncproxy_base_url=http://10.42.0.51:6080/vnc_auto.html
    novncproxy_port=6080
    vncserver_proxyclient_address=10.10.100.51
    vncserver_listen=0.0.0.0

    # Network settings
    network_api_class=nova.network.quantumv2.api.API
    quantum_url=http://10.10.100.51:9696
    quantum_auth_strategy=keystone
    quantum_admin_tenant_name=service
    quantum_admin_username=quantum
    quantum_admin_password=service_pass
    quantum_admin_auth_url=http://10.10.100.51:35357/v2.0
    libvirt_vif_driver=nova.virt.libvirt.vif.LibvirtHybridOVSBridgeDriver
    linuxnet_interface_driver=nova.network.linux_net.LinuxOVSInterfaceDriver
    #If you want Quantum + Nova Security groups
    firewall_driver=nova.virt.firewall.NoopFirewallDriver
    security_group_api=quantum
    #If you want Nova Security groups only, comment the two lines above and uncomment line -1-.
    #-1-firewall_driver=nova.virt.libvirt.firewall.IptablesFirewallDriver

    #Metadata
    service_quantum_metadata_proxy = True
    quantum_metadata_proxy_shared_secret = helloOpenStack
    metadata_host = 10.10.100.51
    metadata_listen = 127.0.0.1
    metadata_listen_port = 8775

    # Compute #
    compute_driver=libvirt.LibvirtDriver

    # Cinder #
    volume_api_class=nova.volume.cinder.API
    osapi_volume_listen_port=5900
```

Edit the /etc/nova/nova-compute.conf:

```bash
    [DEFAULT]
    libvirt_type=kvm
    libvirt_ovs_bridge=br-int
    libvirt_vif_type=ethernet
    libvirt_vif_driver=nova.virt.libvirt.vif.LibvirtHybridOVSBridgeDriver
    libvirt_use_virtio_for_bridges=True
```

Synchronize your database:


```bash
#nova-manage db sync
```
    
Restart nova-* services:

```bash
#cd /etc/init.d/; for i in $( ls nova-* ); do sudo service $i restart; done
```

Check for the smiling faces on nova-* services to confirm your installation:

```bash
#nova-manage service list
```

##Cinder

Install the required packages:

```bash
#apt-get install -y cinder-api cinder-scheduler cinder-volume iscsitarget open-iscsi iscsitarget-dkms
```

Configure the iscsi services:

```bash
#sed -i 's/false/true/g' /etc/default/iscsitarget
```

Restart the services:

```bash
#service iscsitarget start
#service open-iscsi start
```

Prepare a Mysql database for Cinder:

```bash
    mysql -u root -p
    CREATE DATABASE cinder;
    GRANT ALL ON cinder.* TO 'cinderUser'@'%' IDENTIFIED BY 'cinderPass';
    quit;
```

Configure /etc/cinder/api-paste.ini like the following:

```bash
    [filter:authtoken]
    paste.filter_factory = keystoneclient.middleware.auth_token:filter_factory
    service_protocol = http
    service_host = 10.42.0.51
    service_port = 5000
    auth_host = 10.10.100.51
    auth_port = 35357
    auth_protocol = http
    admin_tenant_name = service
    admin_user = cinder
    admin_password = service_pass
```

Edit the /etc/cinder/cinder.conf to:

```bash
    [DEFAULT]
    rootwrap_config=/etc/cinder/rootwrap.conf
    sql_connection = mysql://cinderUser:cinderPass@10.10.100.51/cinder
    api_paste_config = /etc/cinder/api-paste.ini
    iscsi_helper=ietadm
    volume_name_template = volume-%s
    volume_group = cinder-volumes
    verbose = True
    auth_strategy = keystone
    #osapi_volume_listen_port=5900
```
    
Then, synchronize your database:

```bash
#cinder-manage db sync
```

**For intel machines**

create a volume-group called "cinder-volumes" using the empty partition

```bash
#system--config-lvm
#Assign the empty partition for "cinder-volumes"
```

Restart the cinder services:

```bash
#cd /etc/init.d/; for i in $( ls cinder-* ); do sudo service $i restart; done
```

Verify if cinder services are running:

```bash
#cd /etc/init.d/; for i in $( ls cinder-* ); do sudo service $i status; done
```

##Horizon

To install horizon, proceed like this

```bash
#apt-get -y install openstack-dashboard memcached
```

Optional:If you don't like the OpenStack ubuntu theme, you can remove the package to disable it:

```bash
#dpkg --purge openstack-dashboard-ubuntu-theme
```

Reload Apache and memcached:

```bash
#service apache2 restart; service memcached restart
```

You can now access your OpenStack 10.42.0.51/horizon with credentials admin:admin_pass.

##VM Creation

**Create a external network:**

```bash
#quantum net-create public-net --router:external=True

Created a new network:
+---------------------------+--------------------------------------+
| Field                     | Value                                |
+---------------------------+--------------------------------------+
| admin_state_up            | True                                 |
| id                        | 21ea48fb-ee1e-46a4-b589-b3c2b359291d |
| name                      | public-net                           |
| provider:network_type     | gre                                  |
| provider:physical_network |                                      |
| provider:segmentation_id  | 1                                    |
| router:external           | True                                 |
| shared                    | False                                |
| status                    | ACTIVE                               |
| subnets                   |                                      |
| tenant_id                 | 2b942273713741b1868eb86b11e08df8     |
+---------------------------+--------------------------------------+
```
 
 ![import](/images/create_ext_net.png)

**Create a subnet:**

```bash
#quantum subnet-create --tenant-id 2b942273713741b1868eb86b11e08df8 --name public-net-subnet01 --gateway 10.42.0.1 public-net 10.42.0.0/24 --enable_dhcp False

Created a new subnet:
+------------------+----------------------------------------------+
| Field            | Value                                        |
+------------------+----------------------------------------------+
| allocation_pools | {"start": "10.42.0.2", "end": "10.42.0.254"} |
| cidr             | 10.42.0.0/24                                 |
| dns_nameservers  |                                              |
| enable_dhcp      | False                                        |
| gateway_ip       | 10.42.0.1                                    |
| host_routes      |                                              |
| id               | d5b8d223-c2b2-4b87-ae7c-187d37f8b762         |
| ip_version       | 4                                            |
| name             | public-net-subnet01                          |
| network_id       | 21ea48fb-ee1e-46a4-b589-b3c2b359291d         |
| tenant_id        | 2b942273713741b1868eb86b11e08df8             |
+------------------+----------------------------------------------+
```
 
 ![import](/images/create_subnet_ext.png)


**Allocation of IP's to VM's:**


This is not tried but, we can try allocation pool also - this command not tried , pls verify before trying.

```bash
#quantum subnet-create --tenant-id 6973efb023c748d6b8a4fff747faad92 --name public-net-subnet01 --gateway 10.42.0.1 public-net 10.42.0.0/24 --enable_dhcp False --allocation-pool start=10.42.0.75,end=10.42.0.254
```

**Create a private-network:**

```bash
#quantum net-create private-net

Created a new network:
+---------------------------+--------------------------------------+
| Field                     | Value                                |
+---------------------------+--------------------------------------+
| admin_state_up            | True                                 |
| id                        | 428dbfc9-73e1-4e8d-88e2-471a3e91f6a6 |
| name                      | private-net                          |
| provider:network_type     | gre                                  |
| provider:physical_network |                                      |
| provider:segmentation_id  | 2                                    |
| router:external           | False                                |
| shared                    | False                                |
| status                    | ACTIVE                               |
| subnets                   |                                      |
| tenant_id                 | 2b942273713741b1868eb86b11e08df8     |
+---------------------------+--------------------------------------+
```
 
 ![import](/images/create_pvt_net.png)


**Attach subnet to private network:**

```bash
#quantum subnet-create --name private-subnet private-net 10.0.0.0/24

Created a new subnet:
+------------------+--------------------------------------------+
| Field            | Value                                      |
+------------------+--------------------------------------------+
| allocation_pools | {"start": "10.0.0.2", "end": "10.0.0.254"} |
| cidr             | 10.0.0.0/24                                |
| dns_nameservers  |                                            |
| enable_dhcp      | True                                       |
| gateway_ip       | 10.0.0.1                                   |
| host_routes      |                                            |
| id               | 5421a4eb-5b4b-4c3e-9b56-6bb721f99653       |
| ip_version       | 4                                          |
| name             | private-subnet                             |
| network_id       | 428dbfc9-73e1-4e8d-88e2-471a3e91f6a6       |
| tenant_id        | 2b942273713741b1868eb86b11e08df8           |
+------------------+--------------------------------------------+
```
 
 ![import](/images/create_subnet_pvt.png)


**Create router:**

```bash
#quantum router-create router1

Created a new router:
+-----------------------+--------------------------------------+
| Field                 | Value                                |
+-----------------------+--------------------------------------+
| admin_state_up        | True                                 |
| external_gateway_info |                                      |
| id                    | ca972d3b-788e-4e16-8552-dd335575c5c0 |
| name                  | router1                              |
| status                | ACTIVE                               |
| tenant_id             | 2b942273713741b1868eb86b11e08df8     |
+-----------------------+--------------------------------------+
```
 
 ![import](/images/create_router.png)


**Uplink router to public network:**

```bash
#quantum router-gateway-set router1 public-net
```

**Attach private network to router:**

```bash
#quantum router-interface-add router1 private-subnet
```
 
 ![import](/images/router_add_iface.png)


**To show the net list:**

```bash
#ip netns list
qrouter-ca972d3b-788e-4e16-8552-dd335575c5c0
```

```bash
#ip netns exec qrouter-ca972d3b-788e-4e16-8552-dd335575c5c0 ip addr list
10: lo: <LOOPBACK,UP,LOWER_UP> mtu 16436 qdisc noqueue state UNKNOWN 
    link/loopback 00:00:00:00:00:00 brd 00:00:00:00:00:00
    inet 127.0.0.1/8 scope host lo
    inet6 ::1/128 scope host 
       valid_lft forever preferred_lft forever
11: qg-e045e129-e0: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc noqueue state UNKNOWN 
    link/ether fa:16:3e:23:30:ef brd ff:ff:ff:ff:ff:ff
    inet 10.42.0.2/24 brd 10.42.0.255 scope global qg-e045e129-e0
    inet6 fe80::f816:3eff:fe23:30ef/64 scope link 
       valid_lft forever preferred_lft forever
12: qr-696c2816-7e: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc noqueue state UNKNOWN 
    link/ether fa:16:3e:c8:2f:1a brd ff:ff:ff:ff:ff:ff
    inet 10.0.0.1/24 brd 10.0.0.255 scope global qr-696c2816-7e
    inet6 fe80::f816:3eff:fec8:2f1a/64 scope link 
       valid_lft forever preferred_lft forever
```


**Create a Security Group:**
 ![import](/images/create_security_group.png)
 ![import](/images/create_security_group_desc.png)


**Create Keypairs:**
 ![import](/images/create_keypair.png)


**Add Rule:**
 ![import](/images/add_rule.png)


**Edit Security Group Rules:**
 ![import](/images/security_group_rules.png)


**Access and Security**
 ![import](/images/access_and_security.png)



**NOTE: Create a VM using the Horizon dashboard**


**Before creating a VM**
 ![import](/images/empty_instances.png)


**Launch Instance:**
 ![import](/images/launch_instance.png)


**Launch Instance Keypair:**
 ![import](/images/launch_instance_keypair.png)


**Launch Instance Networking:**
 ![import](/images/launch_instance_networking.png)


**My first VM**
 ![import](/images/first_instance.png)


**Network Topology**
 ![import](/images/network_topology.png)


**To ping VM:**

```bash
#ip netns exec qrouter-ca972d3b-788e-4e16-8552-dd335575c5c0 ping 10.0.0.2
```

**To do ssh into VM, do the follwing:**

```bash
#ip netns exec qrouter-36f5ccde-1876-4554-be59-032af24c419c ssh 10.0.0.2 -l cirros
    userid: cirros
    password: cubswin:)
```

**To get all the ports listed:**

```bash
#quantum port-list
```


**GETTING THE VMPORT id FOR ASSIGNING FLOATING IP:**

```bash
#quantum port-list -c id -c fixed_ips -c device_owner 
```

|---
| id | fixed-ips | device-owner | 
|:-|:-:|
| 848d2e3a-ab3f-4e92-ad6d-269d793dde54 | {"subnet_id": "6bfd8ae6-a2b9-4259-b813-4581a15c8d0f", "ip_address": "10.0.0.2"} | compute:None |
| 9e069dc1-4af7-4c5f-a527-3c53d64affc6 | {"subnet_id": "55cbc646-6271-4148-b426-a7e90619e28d", "ip_address": "10.42.0.2"} |network:router_gateway |
| b36a8a56-84db-4b2e-ab0e-2adf2cef88a4 | {"subnet_id": "6bfd8ae6-a2b9-4259-b813-4581a15c8d0f", "ip_address": "10.0.0.3"} | network:dhcp |
| e40639e1-5986-4787-9f6c-452f608b24ff | {"subnet_id": "6bfd8ae6-a2b9-4259-b813-4581a15c8d0f", "ip_address": "10.0.0.1"} | network:router_interface |
|---


The compute port is 848d2e3a-ab3f-4e92-ad6d-269d793dde54 , which has IP 10.0.0.2 in the private subnet id.

```bash
We will use this port id to create a floating IP in the Public network.
    848d2e3a-ab3f-4e92-ad6d-269d793dde54
```

**Alternate way to get the VM port ID:**

```bash

#nova list
+--------------------------------------+---------------+--------+----------------------+
| ID                                   | Name          | Status | Networks             |
+--------------------------------------+---------------+--------+----------------------+
| 2b23d81b-b6db-4dfc-9440-ddf2ed4ef144 | firstinstance | ACTIVE | private-net=10.0.0.2 |
+--------------------------------------+---------------+--------+----------------------+
```


Now use the Device id to get the VM port ID:

```bash
#quantum port-list -- --device_id  2b23d81b-b6db-4dfc-9440-ddf2ed4ef144


|---
| id | name | mac-address | fixed-ips 
|:-|:-:|
| 848d2e3a-ab3f-4e92-ad6d-269d793dde54 | fa:16:3e:79:9e:c4 | {"subnet_id": "6bfd8ae6-a2b9-4259-b813-4581a15c8d0f", "ip_address": "10.0.0.2"} |
|---
```

You can see that we got the VM PORT ID,  848d2e3a-ab3f-4e92-ad6d-269d793dde54 which is same as in the previous case.


Now create a floating IP for the VM with port_id as given above

```bash

#quantum floatingip-list
#should return empty list, since we have not created any ip
```

You can see subnet information with the following command:

```bash

#quantum subnet-list

+--------------------------------------+---------------------+--------------+----------------------------------------------+
| id                                   | name                | cidr         | allocation_pools                             |
+--------------------------------------+---------------------+--------------+----------------------------------------------+
| 55cbc646-6271-4148-b426-a7e90619e28d | public-net-subnet01 | 10.42.0.0/24 | {"start": "10.42.0.2", "end": "10.42.0.254"} |
| 6bfd8ae6-a2b9-4259-b813-4581a15c8d0f | private-subnet      | 10.0.0.0/24  | {"start": "10.0.0.2", "end": "10.0.0.254"}   |
+--------------------------------------+---------------------+--------------+----------------------------------------------+
```


Command to see specific subnet information

```bash
#quantum subnet-show  55cbc646-6271-4148-b426-a7e90619e28d
```

Since we have not created allocation pool initially we need to update the subnet with an allocation pool:
But the below command is not working.

```bash 
#quantum subnet-update 55cbc646-6271-4148-b426-a7e90619e28d --allocation-pool start=10.42.0.75,end=10.42.0.254 public-net 10.42.0.0/24
```

Hence we will create floating point which is already there.

```bash

#quantum floatingip-list
#quantum floatingip-create --port-id 848d2e3a-ab3f-4e92-ad6d-269d793dde54 public-net

   
    Created a new floatingip:
    +---------------------+--------------------------------------+
    | Field               | Value                                |
    +---------------------+--------------------------------------+
    | fixed_ip_address    | 10.0.0.2                             |
    | floating_ip_address | 10.42.0.3                            |
    | floating_network_id | 91cc9a4d-5c5f-4da5-8baf-7fe32f270cdb |
    | id                  | dad364f9-21eb-47c9-a29c-0489536b47eb |
    | port_id             | 848d2e3a-ab3f-4e92-ad6d-269d793dde54 |
    | router_id           | 36f5ccde-1876-4554-be59-032af24c419c |
    | tenant_id           | 6973efb023c748d6b8a4fff747faad92     |
    +---------------------+--------------------------------------+
```

**ssh the virtual machine:**

```bash
#ssh 10.42.0.3 -l cirros 
    The authenticity of host '10.42.0.3 (10.42.0.3)' can't be established.
    RSA key fingerprint is da:f6:87:1a:3f:b6:e9:a4:92:8b:ca:a8:b8:d5:28:0d.
    Are you sure you want to continue connecting (yes/no)? yes
    Warning: Permanently added '10.42.0.3' (RSA) to the list of known hosts.
    #cirros@10.42.0.3's password: 
    cubswin:)
    $ 
```

**Portforwarding:**

After this we did the port forwarding on Zentyal

```bash 
#eth1 src = TCP/IP port=25920   dest ip=10.42.0.3  dest port =  22 
```

Logging in to the VM from external network

```bash
#ssh 183.83.27.73 -p 25920 -l cirros
    The authenticity of host '10.42.0.3 (10.42.0.3)' can't be established.
    RSA key fingerprint is da:f6:87:1a:3f:b6:e9:a4:92:8b:ca:a8:b8:d5:28:0d.
    Are you sure you want to continue connecting (yes/no)? yes
    Warning: Permanently added '10.42.0.3' (RSA) to the list of known hosts.
    #cirros@10.42.0.3's password:
    cubswin:)
    $ $ 
    $ 
    $ pwd
    /home/cirros
    $ ls -al
    total 5
    drwxr-xr-x    2 cirros   cirros        1024 Jun 21 06:31 .
    drwxrwxr-x    4 root     root          1024 Oct 20  2011 ..
    -rw-------    1 cirros   cirros         119 Jun 21 07:22 .ash_history
    -rwxr-xr-x    1 cirros   cirros          43 Oct 20  2011 .profile
    -rwxr-xr-x    1 cirros   cirros          66 Oct 20  2011 .shrc
    #df -k
    Filesystem           1K-blocks      Used Available Use% Mounted on
    /dev                    248936         0    248936   0% /dev
    /dev/vda1                23797     13201      9368  58% /
    tmpfs                   252056         0    252056   0% /dev/shm
```



















