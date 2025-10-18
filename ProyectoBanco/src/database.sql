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

create table cAccount (
        accountId int auto_increment primary key,
        mainId int not null,
        cardNum varchar(16) not null,
        balance decimal(12,2) not null default 0,
        clabe varchar(18) not null,
        accNum varchar(10) not null,
        accPhone varchar(10),
        constraint fk_caccount_main foreign key (mainId) references main(mainId)
            on delete cascade
            on update cascade,
        unique key uq_caccount_cardNum (cardNum),
        unique key uq_caccount_clabe (clabe),
        unique key uq_caccount_accNum (accNum),
        index idx_caccount_mainId (mainId)
);

create table transfer (
	tranId int auto_increment primary key,
    origin varchar (30) not null,
    destiny varchar (30) not null,
    ammount double not null,
    fee double not null,
    description varchar (300),
    doDate date
);

select * from main;
select * from customer;
select * from employee;

drop database Banco_Jety;	

delete from main where mainId = 2;
