---
title: Single Flat Network Setup
---

#Controller Node - OpenStack Networking Server
Install the OpenStack Networking server.

Create database ovs_quantum

Update the OpenStack Networking configuration file, /etc/quantum/quantum.conf
setting plugin choice and Identity Service user as necessary:
```xml
   [DEFAULT]
   core_plugin = quantum.plugins.openvswitch.ovs_quantum_plugin.
   OVSQuantumPluginV2
   control_exchange = quantum
   rabbit_host = controlnode
   notification_driver = quantum.openstack.common.notifier.rabbit_notifier
   [keystone_authtoken]
   admin_tenant_name=servicetenant
   admin_user=quantum
   admin_password=servicepassword
```

Update the plugin configuration file, /etc/quantum/plugins/openvswitch/
ovs_quantum_plugin.ini:
```xml
   [DATABASE]
   sql_connection = mysql://root:root@controlnode:3306/ovs_quantum?charset=utf8
   [OVS]
   network_vlan_ranges = physnet1
   bridge_mappings = physnet1:br-eth0
```

Start the OpenStack Networking service


#Compute Node - OpenStack Compute

Install the nova-compute service.

Update the OpenStack Compute configuration file, /etc/nova/nova.conf. Make sure
the following is at the end of this file:
```xml
     network_api_class=nova.network.quantumv2.api.API
     quantum_admin_username=quantum
     quantum_admin_password=servicepassword
     quantum_admin_auth_url=http://controlnode:35357/v2.0/
     quantum_auth_strategy=keystone
     quantum_admin_tenant_name=servicetenant
     quantum_url=http://controlnode:9696/
     libvirt_vif_driver=nova.virt.libvirt.vif.LibvirtHybridOVSBridgeDriver
```

Restart the OpenStack Compute service:


#Compute and Network Node - L2 Agent

Install the L2 agent.

Add the integration bridge to the Open vSwitch:
```xml
    #sudo ovs-vsctl add-br br-int
```

Update the OpenStack Networking configuration file, /etc/quantum/quantum.conf:
```xml
     
     [DEFAULT]
     core_plugin = quantum.plugins.openvswitch.ovs_quantum_plugin.
     OVSQuantumPluginV2
     control_exchange = quantum
     rabbit_host = controlnode
     notification_driver = quantum.openstack.common.notifier.rabbit_notifier
```

Update the plugin configuration file, /etc/quantum/plugins/openvswitch/
ovs_quantum_plugin.ini:
```xml
     [DATABASE]
     sql_connection = mysql://root:root@controlnode:3306/ovs_quantum?charset=
     utf8
     [OVS]
     network_vlan_ranges = physnet1
     bridge_mappings = physnet1:br-eth0
```
Create the network bridge br-eth0 (All VM communication between the nodes will be
```xml
      #sudo ovs-vsctl add-br br-eth0
      #sudo ovs-vsctl add-port br-eth0 eth0
```

Start the OpenStack Networking L2 agent

#Network Node - DHCP Agent

Install the DHCP agent.

Update the OpenStack Networking configuration file, /etc/quantum/quantum.conf:
```xml
      
      [DEFAULT]
      core_plugin = quantum.plugins.openvswitch.ovs_quantum_plugin.
      OVSQuantumPluginV2
      control_exchange = quantum
      rabbit_host = controlnode
      notification_driver = quantum.openstack.common.notifier.rabbit_notifier
```

Update the DHCP configuration file /etc/quantum/dhcp_agent.ini:
```xml
     
      interface_driver = quantum.agent.linux.interface.OVSInterfaceDriver

Start the DHCP agent


#Logical Network Configuration

All of the commands below can be executed on the network node.

Note please ensure that the following environment variables are set. These are used by the
various clients to access OpenStack Identity.
```xml
      
      export  OS_USERNAME=admin
      export  OS_PASSWORD=adminpassword
      export  OS_TENANT_NAME=admin
      export  OS_AUTH_URL=http://127.0.0.1:5000/v2.0/
```

Get the tenant ID (Used as $TENANT_ID later):
```xml
     #keystone tenant-list


+----------------------------------+---------+---------+
|
id
|
name | enabled |
+----------------------------------+---------+---------+
| 247e478c599f45b5bd297e8ddbbc9b6a | TenantA |
True |
| 2b4fec24e62e4ff28a8445ad83150f9d | TenantC |
True |
| 3719a4940bf24b5a8124b58c9b0a6ee6 | TenantB |
True |
| 5fcfbc3283a142a5bb6978b549a511ac |
demo |
True |
| b7445f221cda4f4a8ac7db6b218b1339 | admin |
True |
+----------------------------------+---------+---------+
```

Get the User information:
```xml
   #keystone user-list

+----------------------------------+-------+---------+-------------------+
|
id
| name | enabled |
email
|
+----------------------------------+-------+---------+-------------------+
| 5a9149ed991744fa85f71e4aa92eb7ec | demo |
True |
|
| 5b419c74980d46a1ab184e7571a8154e | admin |
True | admin@example.com |
| 8e37cb8193cb4873a35802d257348431 | UserC |
True |
|
| c11f6b09ed3c45c09c21cbbc23e93066 | UserB |
True |
|
| ca567c4f6c0942bdac0e011e97bddbe3 | UserA |
True |
|
+----------------------------------+-------+---------+-------------------+
```

Created a new network:

Create a internal shared network on the demo tenant ($TENANT_ID will be
b7445f221cda4f4a8ac7db6b218b1339):
```xml
     #quantum net-create --tenant-id $TENANT_ID sharednet1 --shared --
     provider:network_type flat --provider:physical_network physnet1

+---------------------------+--------------------------------------+
| Field
| Value
|
+---------------------------+--------------------------------------+
| admin_state_up
| True
|
| id
| 04457b44-e22a-4a5c-be54-a53a9b2818e7 |
| name
| sharednet1
|
| provider:network_type
| flat
|
| provider:physical_network | physnet1
|
| provider:segmentation_id |
|
| router:external
| False
|
| shared
| True
|
| status
| ACTIVE
|
| subnets
|
|
| tenant_id
| b7445f221cda4f4a8ac7db6b218b1339
|
+---------------------------+--------------------------------------+
```
 
Create a subnet on the network:
```xml
     
     #quantum subnet-create --tenant-id $TENANT_ID sharednet1 30.0.0.0/24
    

+------------------+--------------------------------------------+
| Field
| Value
|
+------------------+--------------------------------------------+
| allocation_pools | {"start": "30.0.0.2", "end": "30.0.0.254"} |
| cidr
| 30.0.0.0/24
|
| dns_nameservers |
|
| enable_dhcp
| True
|
| gateway_ip
| 30.0.0.1
|
| host_routes
|
|
| id
| b8e9a88e-ded0-4e57-9474-e25fa87c5937
|
| ip_version
| 4
|
| name
|
|
| network_id
| 04457b44-e22a-4a5c-be54-a53a9b2818e7
|
| tenant_id
| 5fcfbc3283a142a5bb6978b549a511ac
|
+------------------+--------------------------------------------+
```

Create a server for tenant A:
```xml
     
     #nova --os-tenant-name TenantA --os-username UserA --os-password password
     --os-auth-url=http://localhost:5000/v2.0 boot --image tty --flavor 1 --nic
     net-id=04457b44-e22a-4a5c-be54-a53a9b2818e7 TenantA_VM1
     nova --os-tenant-name TenantA --os-username UserA --os-password password --
     os-auth-url=http://localhost:5000/v2.0 list


+--------------------------------------+-------------+--------
+---------------------+
| ID
| Name
| Status | Networks
|
+--------------------------------------+-------------+--------
+---------------------+
| 09923b39-050d-4400-99c7-e4b021cdc7c4 | TenantA_VM1 | ACTIVE | sharednet1=
30.0.0.3 |
+--------------------------------------+-------------+--------
+---------------------+
```

Ping the server of tenant A:
```xml
    #sudo ip addr flush eth0
    #sudo ip addr add 30.0.0.201/24 dev br-eth0
    #ping 30.0.0.3
```
Ping the public network within the server of tenant A:
```xml
     
     #ping 192.168.1.1
     PING 192.168.1.1 (192.168.1.1) 56(84) bytes of data.
     64 bytes from 192.168.1.1: icmp_req=1 ttl=64 time=1.74 ms
     64 bytes from 192.168.1.1: icmp_req=2 ttl=64 time=1.50 ms
     64 bytes from 192.168.1.1: icmp_req=3 ttl=64 time=1.23 ms
     (press ctrl+c)
     --- 192.168.1.1 ping statistics ---
      3 packets transmitted, 3 received, 0% packet loss, time 2003ms
      rtt min/avg/max/mdev = 1.234/1.495/1.745/0.211 ms
```

Note: The 192.168.1.1 is an IP on public network that the router is connecting.

Create servers for other tenants

We can create servers for other tenants with similar commands. Since all these VMs
share the same subnet, they will be able to access each other.



