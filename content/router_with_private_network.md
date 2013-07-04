---
title: Router With Private Network
---

#Installations

Controller

Install the packages :
```xml
    
    #apt-get install -y quantum-server
```
Configure Quantum services :

Edit /etc/quantum/quantum.conf file and modify :
```xml
    core_plugin = \
    quantum.plugins.openvswitch.ovs_quantum_plugin.OVSQuantumPluginV2
    auth_strategy = keystone
    fake_rabbit = False
    rabbit_password = password
```

Edit /etc/quantum/plugins/openvswitch/ovs_quantum_plugin.ini file and modify :
```xml
    
    [DATABASE]
    sql_connection = mysql://quantum:password@localhost:3306/quantum
    [OVS]
    tenant_network_type = vlan
    network_vlan_ranges = physnet1:100:2999
```

Edit /etc/quantum/api-paste.ini file and modify :
```xml
    
    admin_tenant_name = service
    admin_user = quantum
    admin_password = password
```

Start the services :
```xml
    
    #service quantum-server restart
```

#Network Node

Install the packages:
```xml
     
     #apt-get install -y quantum-plugin-openvswitch-agent \
     quantum-dhcp-agent quantum-l3-agent
```

Start Open vSwitch:
```xml
     
     #service openvswitch-switch start
```

Add the integration bridge to the Open vSwitch:
```xml
     
      #sudo ovs-vsctl add-br br-int
```
Update the OpenStack Networking configuration file, /etc/quantum/quantum.conf:
```xml
     
     rabbit_password = password
     rabbit_host = 192.168.0.1
```

Update the plugin configuration file, /etc/quantum/plugins/openvswitch/
ovs_quantum_plugin.ini:
```xml
     
     [DATABASE]
     sql_connection = mysql://quantum:password@192.168.0.1:3306/quantum
     [OVS]
     tenant_network_type=vlan
     network_vlan_ranges = physnet1:1:4094
     bridge_mappings = physnet1:br-eth1
```

Create the network bridge br-eth1 (All VM communication between the nodes will be
done via eth1):
```xml

     #sudo ovs-vsctl add-br br-eth1
     #sudo ovs-vsctl add-port br-eth1 eth1
```

Create the external network bridge to the Open vSwitch:
```xml 
     
     #sudo ovs-vsctl add-br br-ex
     #sudo ovs-vsctl add-port br-ex eth2
```

Edit , /etc/quantum/l3_agent.ini file and modify:
```xml
      
     [DEFAULT]
     auth_url = http://192.168.0.1:35357/v2.0
     admin_tenant_name = service
     admin_user = quantum
     admin_password = password
     metadata_ip = 192.168.0.1
     use_namespaces = True
```

Edit , /etc/quantum/api-paste.ini file and modify:
```xml
     
     [DEFAULT]
     auth_host = 192.168.0.1
     admin_tenant_name = service
     admin_user = quantum
     admin_password = password
```

Edit , /etc/quantum/dhcp_agent.ini file and modify:
```xml 
     
     use_namespaces = True
```

Restart networking services
```xml
     #service quantum-plugin-openvswitch-agent start
     #service quantum-dhcp-agent restart
     #service quantum-l3-agent restart
```
Compute Node

Install the packages.
```xml
     #apt-get install -y openvswitch-switch quantum-plugin-openvswitch-agent
```
Start open vSwitch Service
```xml
     #service openvswitch-switch start
```
Configure Virtual Bridging
```xml
     
    #sudo ovs-vsctl add-br br-int
```

Update the OpenStack Networking configuration file, /etc/quantum/quantum.conf:
```xml
     rabbit_password = password
     rabbit_host = 192.168.0.1
```

Update /etc/quantum/plugins/openvswitch/ovs_quantum_plugin.ini:
```xml
     [DATABASE]
     sql_connection = mysql://quantum:password@192.168.0.1:3306/quantum
     [OVS]
     tenant_network_type = vlan
     network_vlan_ranges = physnet1:1:4094
     bridge_mappings = physnet1:br-eth1
```

Start the DHCP agent
```xml
     #service quantum-plugin-openvswitch-agent restart
```
#Logical Network Configuration

All of the commands below can be done on the Network node.

Note please ensure that the following environment variables are set. These are used by the
various clients to access OpenStack Identity.
```xml
Create novarc file :
     export  OS_TENANT_NAME=admin
     export  OS_USERNAME=admin
     export  OS_PASSWORD=password
     export  OS_AUTH_URL="http://192.168.0.1:5000/v2.0/"
     export  SERVICE_ENDPOINT="http://192.168.0.1:35357/v2.0"
     export SERVICE_TOKEN=password
```

Export the variables :
Load it:
```xml
     
     #source novarc
     #echo "source novarc">>.bashrc
```
Internal Networking Configuration:

Get the tenant ID (Used as $TENANT_ID later).
```xml
     #keystone tenant-list

     +----------------------------------+--------------------+---------+
     |
     id
     |
     name
     | enabled |
     +----------------------------------+--------------------+---------+
     | 48fb81ab2f6b409bafac8961a594980f |
     admin
     |
     True |
     | cbb574ac1e654a0a992bfc0554237abf |
     service
     |
     True |
     | e371436fe2854ed89cca6c33ae7a83cd | invisible_to_admin |
     True |
     | e40fa60181524f9f9ee7aa1038748f08 |
     demo
     |
     True |
     +----------------------------------+--------------------+---------+
```

Create a internal network named net1 on the demo tenant ($TENANT_ID will be
e40fa60181524f9f9ee7aa1038748f08):
```xml
     
      #quantum net-create --tenant-id $TENANT_ID net1 --provider:network_type
      vlan \
      --provider:physical_network physnet1 --provider:segmentation_id 1024


     +---------------------------+--------------------------------------+
     | Field
     | Value
     |
     +---------------------------+--------------------------------------+
     | admin_state_up
     | True 
     |
     | id 
     | e99a361c-0af8-4163-9feb-8554d4c37e4f |
     | name
     | net1
     |
     | provider:network_type
     | vlan
     |
     | provider:physical_network | physnet1
     |
     | provider:segmentation_id | 1024
     |
     | router:external
     | False
     |
     | shared
     | False
     |
     | status
     | ACTIVE
     |
     | subnets
     |
     |
     | tenant_id
     | e40fa60181524f9f9ee7aa1038748f08
     |
     +---------------------------+--------------------------------------+
```

Create a subnet on the network net1 (ID field below is used as $SUBNET_ID later):
```xml
     
     #quantum subnet-create --tenant-id $TENANT_ID net1 10.5.5.0/24

     +------------------+--------------------------------------------+
     | Field
     | Value
     |
     +------------------+--------------------------------------------+
     | allocation_pools | {"start": "10.5.5.2", "end": "10.5.5.254"} |
     | cidr
     | 10.5.5.0/24
     |
     | dns_nameservers |
     |
     | enable_dhcp
     | True
     |
     | gateway_ip
     | 10.5.5.1
     |
     | host_routes
     |
     |
     | id
     | c395cb5d-ba03-41ee-8a12-7e792d51a167
     |
     | ip_version
     | 4
     |
     | name
     |
     |
     | network_id
     | e99a361c-0af8-4163-9feb-8554d4c37e4f
     |
     | tenant_id
     | e40fa60181524f9f9ee7aa1038748f08
|
+------------------+--------------------------------------------+
```


External Networking Configuration

Create a router named router1 (ID is used as $ROUTER_ID later):
```xml
     
      #quantum router-create --tenant_id $TENANT_ID router1

     +-----------------------+--------------------------------------+
     | Field
     | Value
     |
     +-----------------------+--------------------------------------+
     | admin_state_up
     | True
     |
     | external_gateway_info |
     |
     | id
     | 685f64e7-a020-4fdf-a8ad-e41194ae124b |
     | name
     | router1
     |
     | status
     | ACTIVE
     |
     | tenant_id
     | e40fa60181524f9f9ee7aa1038748f08
     |
     +-----------------------+--------------------------------------+
```

Add an interface to router1 and attach the net1 subnet:
```xml
      
      #quantum router-interface-add $ROUTER_ID $SUBNET_ID
```

Added interface to router 685f64e7-a020-4fdf-a8ad-e41194ae124b

Create the external network named ext_net. Environment variables will attach this
to the admin tenant (Used as $EXTERNAL_NETWORK_ID). Note this is a different
$TENANT_ID than used previously:
```xml
     
     #quantum net-create ext_net --router:external=True

     +---------------------------+--------------------------------------+
     | Field
     | Value
     |
     +---------------------------+--------------------------------------+
     | admin_state_up
     | True
     |
     | id
     | 8858732b-0400-41f6-8e5c-25590e67ffeb |
     | name
     | ext_net
     |
     | provider:network_type
     | vlan
     |
     | provider:physical_network | physnet1
     |
     | provider:segmentation_id | 1
     |
     | router:external
     | True
     |
     | shared
     | False
     |
     | status
     | ACTIVE
     |
     | subnets
     |
     |
     | tenant_id
     | 48fb81ab2f6b409bafac8961a594980f
     |
     +---------------------------+--------------------------------------+
```

Create the subnet for floating IPs. Note the DHCP service is disabled for this subnet:
```xml
      
       #quantum subnet-create ext_net --allocation-pool start=7.7.7.130,end=7.7.7.
       150 \
       --gateway 7.7.7.1 7.7.7.0/24 -- --enable_dhcp=False

      +------------------+--------------------------------------------------+
      | Field
      | Value
      |
      +------------------+--------------------------------------------------+
      | allocation_pools | {"start": "7.7.7.130", "end": "7.7.7.150"}
      |
      | cidr
      | 7.7.7.0/24
      |
      | dns_nameservers |
      |
      | enable_dhcp
      | False
      |
      | gateway_ip
      | 7.7.7.1
      |
      | host_routes
      |
      |
      | id
      | aef60b55-cbff-405d-a81d-406283ac6cff
      |
      | ip_version
      | 4
      |
      | name
      |
      |
      | network_id
      | 8858732b-0400-41f6-8e5c-25590e67ffeb
      |
      | tenant_id
      | 48fb81ab2f6b409bafac8961a594980f 
      |
      +------------------+--------------------------------------------------+
```

Set the router gateway towards the external network:
```xml 
      #quantum router-gateway-set $ROUTER_ID $EXTERNAL_NETWORK_ID
```

Set gateway for router 685f64e7-a020-4fdf-a8ad-e41194ae124b

Floating IP Allocation

After a VM is deployed a floating IP address can be associated to the VM. A VM that is
created will be allocated an OpenStack Networking port ($PORT_ID). The port ID for
the VM can be retrieved as follows (VIA the Controller or Compute Node) :
```xml
     #nova list

     +--------------------------------------+--------+--------+---------------+
     |
     ID
     | Name | Status |
     Networks
     |
     +--------------------------------------+--------+--------+---------------+
     | 1cdc671d-a296-4476-9a75-f9ca1d92fd26 | testvm | ACTIVE | net1=10.5.5.3 |
     +--------------------------------------+--------+--------+---------------+
     quantum port-list -- --device_id 1cdc671d-a296-4476-9a75-f9ca1d92fd26
     +--------------------------------------+------+-------------------
     +---------------------------------------------------------------------------------
     +
     | id
     | name | mac_address
     |
     fixed_ips
     |
     +--------------------------------------+------+-------------------
     +---------------------------------------------------------------------------------
     +
     | 9aa47099-b87b-488c-8c1d-32f993626a30 |
     | fa:16:3e:b4:d6:6c |
     {"subnet_id": "c395cb5d-ba03-41ee-8a12-7e792d51a167", "ip_address": "10.
     0.0.3"} |
     +--------------------------------------+------+-------------------
     +---------------------------------------------------------------------------------
     +
```

Allocate a floating IP (Used as $FLOATING_ID):
```xml
     #quantum floatingip-create ext_net

     +---------------------+--------------------------------------+
     | Field
     | Value
     |
     +---------------------+--------------------------------------+
     | fixed_ip_address
     |
     |
     | floating_ip_address | 7.7.7.131
     |
     | floating_network_id | 8858732b-0400-41f6-8e5c-25590e67ffeb |
     | id
     | 40952c83-2541-4d0c-b58e-812c835079a5 |
     | port_id
     |
     |
     | router_id
     |
     |
     | tenant_id
     | e40fa60181524f9f9ee7aa1038748f08
     |
     +---------------------+--------------------------------------+
```
Associate a floating IP to a VM (in the case of the example it is 9aa47099-
b87b-488c-8c1d-32f993626a30):
```xml
    #quantum floatingip-associate $FLOATING_ID $PORT_ID
    Associated floatingip 40952c83-2541-4d0c-b58e-812c835079a5
```
Show the floating IP:
```xml
      #quantum floatingip-show $FLOATING_ID

      +---------------------+--------------------------------------+
      | Field
      | Value
      |
      +---------------------+--------------------------------------+
      | fixed_ip_address
      | 10.5.5.3
      |
      | floating_ip_address | 7.7.7.131
      |
      | floating_network_id | 8858732b-0400-41f6-8e5c-25590e67ffeb |
      | id
      | 40952c83-2541-4d0c-b58e-812c835079a5 |
      | port_id
      | 9aa47099-b87b-488c-8c1d-32f993626a30 |
      | router_id
      | 685f64e7-a020-4fdf-a8ad-e41194ae124b |
      | tenant_id
      | e40fa60181524f9f9ee7aa1038748f08
      |
      +---------------------+--------------------------------------+
```

Test the floating IP:
```xml
    
    #ping 7.7.7.131
    PING 7.7.7.131 (7.7.7.131) 56(84) bytes of data.
    64 bytes from 7.7.7.131: icmp_req=2 ttl=64 time=0.152 ms
    64 bytes from 7.7.7.131: icmp_req=3 ttl=64 time=0.049 ms
    (press ctrl+c)
```
