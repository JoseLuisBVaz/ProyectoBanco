create database Banco_Jety;

use Banco_Jety;

create table main (
	mainId int auto_increment primary key,
    mail varchar (100) not null,
    pass varchar(100) not null,
    rol enum ('c', 'e', 'm') not null
);

create table customer (
	mainId int auto_increment primary key,
    foreign key (mainId) references main(mainId)
    on delete cascade
    on update cascade,
    phoneNumber varchar(12) not null,
    firstName varchar(100) not null,
    lastNameP varchar(50) not null,
    lastNameM varchar(50) not null,
    birthday date not null,
    address varchar (250) not null,
    enterDate timestamp default current_timestamp not null,
    curp varchar (18) not null,
    rfc varchar (13)
);

create table employee (
	mainId int auto_increment primary key,
    foreign key (mainId) references main(mainId)
    on delete cascade
    on update cascade,
    phoneNumber varchar(12) not null,
    firstName varchar(100) not null,
    lastNameP varchar(50) not null,
    lastNameM varchar(50) not null,
    birthday date not null,
    address varchar (250) not null,
    enterDate timestamp default current_timestamp not null,
    curp varchar (18) not null,
    rfc varchar (13),
    nss varchar (11)
);

