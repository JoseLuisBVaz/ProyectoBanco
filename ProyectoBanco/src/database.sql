create database Banco_Jety;

use Banco_Jety;

create table main (
	mainId int auto_increment primary key,
    mail varchar (100) not null,
    pass varchar(16) not null,
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
    rfc varchar (13),
	balance double not null,
    cardNum varchar(16),
    creditCardNum varchar(16)
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

insert into main (mail, pass, rol)
values ("martHc@gmail.com", "1234abc", 'c'),
("tgmhyh@gmail.com", "4321cba", 'e'),
("test@test.com", "test123", 'm');

insert into customer (mainId, phoneNumber, firstName, lastNameP, lastNameM, birthday, address, curp, rfc, balance, cardNum, creditCardNum)
values (
    1,
    "5512345678",
    "Martin",
    "Hinojosa",
    "Carrillo",
    "1990-05-15",
    "Calle Falsa 123, Colonia Centro, Ciudad de México, CP 06000",
    "HICM900515HDFRRA01",
    "HICM900515ABC",
    15000.50,
    "1234567890123456", 
    "9876543210987654" 
);


insert into employee (mainId, phoneNumber, firstName, lastNameP, lastNameM, birthday, address, curp, rfc, nss)
values (
    2, 
    "5587654321",
    "Erick",
    "Hernandez",
    "Castañeda",
    "1985-11-20",
    "Avenida Siempre Viva 742, Colonia Roma, Ciudad de México, CP 06700",
    "HECE851120HDFLNA02",
    "HECE851120XYZ",
    "12345678901" 
);


insert into employee (mainId, phoneNumber, firstName, lastNameP, lastNameM, birthday, address, curp, rfc, nss)
values (
    3, 
    "5511223344",
    "Senyazi",
    "Garcia",
    "Hernandez",
    "1988-02-10",
    "Boulevard de los Sueños Rotos 45, Colonia Condesa, Ciudad de México, CP 06140",
    "GAHS880210MDFRRA03",
    "GAHS880210QWE",
    "09876543211"
);

select * from customer;
