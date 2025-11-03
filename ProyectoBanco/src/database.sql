create database if not exists banco_jety;
use banco_jety;

-- consultas
show tables;
select * from main;
select * from customer;
select * from employee;
select * from caccount;
select * from transfer;
select * from deposito;
select * from retiros;
select * from creditdisposal;



-- tabla principal de usuarios
create table main (
    mainid int auto_increment primary key,
    mail varchar(100) not null,
    pass varchar(100) not null,
    rol enum ('c','e','m') not null
);

-- tabla de clientes
create table customer (
    mainid int primary key,
    phonenumber varchar(12) not null,
    firstname varchar(100) not null,
    lastnamep varchar(50) not null,
    lastnamem varchar(50) not null,
    birthday date not null,
    address varchar(250) not null,
    enterdate timestamp default current_timestamp not null,
    curp varchar(18) not null,
    rfc varchar(13),
    foreign key (mainid) references main(mainid)
        on delete cascade
        on update cascade
);

-- tabla de empleados
create table employee (
    mainid int primary key,
    phonenumber varchar(12) not null,
    firstname varchar(100) not null,
    lastnamep varchar(50) not null,
    lastnamem varchar(50) not null,
    birthday date not null,
    address varchar(250) not null,
    enterdate timestamp default current_timestamp not null,
    curp varchar(18) not null,
    rfc varchar(13),
    nss varchar(11),
    foreign key (mainid) references main(mainid)
        on delete cascade
        on update cascade
);

-- cuentas bancarias
create table caccount (
    accountid int auto_increment primary key,
    mainid int not null,
    cardnum varchar(16) not null,
    balance decimal(12,2) not null default 0,
    clabe varchar(18) not null,
    accnum varchar(10) not null,
    accphone varchar(10),
    acctype enum('debito','credito') not null,
    constraint fk_caccount_main foreign key (mainid)
        references main(mainid)
        on delete cascade on update cascade,
    unique key uq_caccount_cardnum (cardnum),
    unique key uq_caccount_clabe (clabe),
    unique key uq_caccount_accnum (accnum),
    index idx_caccount_mainid (mainid)
);

-- transferencias
create table transfer (
    tranid int auto_increment primary key,
    origin varchar(30) not null,
    destiny varchar(30) not null,
    ammount decimal(12,2) not null,
    fee decimal(12,2) not null,
    description varchar(300),
    dodate date
);

-- depositos
create table if not exists deposito (
    depid int auto_increment primary key,
    mainid int not null,
    accnum varchar(10) not null,
    amount decimal(12,2) not null,
    description varchar(300),
    depositdate timestamp default current_timestamp not null,
    constraint fk_deposito_main foreign key (mainid) references main(mainid),
    constraint fk_deposito_account foreign key (accnum) references caccount(accnum)
);

-- retiros
create table if not exists retiros (
  withdrawid int auto_increment primary key,
  mainid int not null,
  accnum varchar(10) not null,
  amount decimal(12,2) not null,
  description varchar(300),
  withdrawdate timestamp default current_timestamp,
  constraint fk_retiros_main foreign key (mainid) references main(mainid)
    on delete cascade on update cascade,
  constraint fk_retiros_acc foreign key (accnum) references caccount(accnum)
    on delete cascade on update cascade,
  index idx_retiros_mainid (mainid),
  index idx_retiros_accnum (accnum),
  index idx_retiros_date (withdrawdate)
);

-- disposicion de credito (actualizada)
drop table if exists creditdisposal;

create table creditdisposal (
    disposalid int auto_increment primary key,
    accountid int not null,
    amount decimal(12,2) not null,
    description varchar(300),
    timestamp timestamp default current_timestamp,
    availableafter decimal(12,2),
    constraint fk_creditdisposal_account foreign key (accountid) 
        references caccount(accountid)
        on delete cascade on update cascade,
    index idx_creditdisposal_accountid (accountid),
    index idx_creditdisposal_date (timestamp)
);

-- funciones
drop function if exists fn_calculate_credit_limit;

delimiter $$
create function fn_calculate_credit_limit(p_mainid int)
returns decimal(12,2)
deterministic
reads sql data
begin
    declare v_avg_monthly_deposits decimal(12,2);
    declare v_credit_limit decimal(12,2);
    declare v_months_with_data int;
    declare v_min_limit decimal(12,2) default 5000.00;
    
    select 
        coalesce(avg(monthly_total), 0),
        count(distinct deposit_month)
    into 
        v_avg_monthly_deposits,
        v_months_with_data
    from (
        select 
            date_format(depositdate, '%y-%m') as deposit_month,
            sum(amount) as monthly_total
        from deposito
        where mainid = p_mainid
          and depositdate >= date_sub(curdate(), interval 1 month)
        group by date_format(depositdate, '%y-%m')
    ) as monthly_deposits;
    
    if v_months_with_data < 1 then
        return v_min_limit;
    end if;
    
    set v_credit_limit = v_avg_monthly_deposits * 1;
    
    if v_credit_limit < v_min_limit then
        return v_min_limit;
    end if;
    
    return round(v_credit_limit / 1000) * 1000;
end $$
delimiter ;

-- procedimientos
drop procedure if exists sp_transfer_funds;

delimiter $$

create procedure sp_transfer_funds(
  in p_origin varchar(30),
  in p_destiny varchar(30),
  in p_amount decimal(12,2),
  in p_description varchar(300)
)
begin
  declare v_origin_accountid int;
  declare v_dest_accountid int;
  declare v_origin_balance decimal(12,2);
  declare v_tranid int;
  declare v_fee decimal(12,2);
  declare v_not_found int default 0;

  declare continue handler for not found set v_not_found = 1;

  if p_origin is null or p_destiny is null or p_amount is null then
    signal sqlstate '45000' set message_text = 'parametros invalidos o nulos.';
  end if;
  
  if p_amount <= 0 then
    signal sqlstate '45000' set message_text = 'el monto debe ser mayor a 0.';
  end if;
  
  if p_origin = p_destiny then
    signal sqlstate '45000' set message_text = 'cuenta origen y destino iguales.';
  end if;

  set v_fee = (floor(p_amount / 100) * 5) + (floor(p_amount / 1500) * 10);

  start transaction;
  set v_not_found = 0;
  select accountid, balance into v_origin_accountid, v_origin_balance
  from caccount where accnum = p_origin or clabe = p_origin for update;
    
  if v_not_found = 1 or v_origin_accountid is null then
    rollback;
    signal sqlstate '45000' set message_text = 'cuenta de origen no encontrada.';
  end if;

  set v_not_found = 0;
  select accountid into v_dest_accountid
  from caccount where accnum = p_destiny or clabe = p_destiny for update;
    
  if v_not_found = 1 or v_dest_accountid is null then
    rollback;
    signal sqlstate '45000' set message_text = 'cuenta de destino no encontrada.';
  end if;

  if v_origin_accountid = v_dest_accountid then
    rollback;
    signal sqlstate '45000' set message_text = 'cuentas iguales.';
  end if;

  if v_origin_balance < (p_amount + v_fee) then
    rollback;
    signal sqlstate '45000' set message_text = 'fondos insuficientes.';
  end if;

  update caccount set balance = balance - (p_amount + v_fee) where accountid = v_origin_accountid;
  update caccount set balance = balance + p_amount where accountid = v_dest_accountid;

  insert into transfer (origin, destiny, ammount, fee, description, dodate)
  values (p_origin, p_destiny, p_amount, v_fee, p_description, curdate());

  set v_tranid = last_insert_id();
  commit;

  select v_tranid as tranid, v_fee as fee;
end$$

delimiter ;

-- procedimiento para disposicion de credito (actualizado)
drop procedure if exists sp_dispose_credit;

delimiter $$
create procedure sp_dispose_credit(
    in p_accountid int,
    in p_amount decimal(12,2),
    in p_description varchar(300)
)
begin
    declare v_acctype varchar(20);
    declare v_balance decimal(12,2);
    declare v_creditlimit decimal(12,2);
    declare v_available decimal(12,2);
    declare v_newavailable decimal(12,2);
    declare v_disposalid int;
    declare v_mainid int;
    
    declare exit handler for sqlexception
    begin
        rollback;
        resignal;
    end;
    
    if p_accountid is null or p_amount is null then
        signal sqlstate '45000' 
        set message_text = 'parametros invalidos o nulos';
    end if;
    
    if p_amount <= 0 then
        signal sqlstate '45000' 
        set message_text = 'el monto debe ser mayor a 0';
    end if;
    
    start transaction;
    
    select acctype, balance, mainid 
    into v_acctype, v_balance, v_mainid
    from caccount 
    where accountid = p_accountid
    for update;
    
    if v_acctype is null then
        rollback;
        signal sqlstate '45000' 
        set message_text = 'cuenta no encontrada';
    end if;
    
    if v_acctype != 'credito' then
        rollback;
        signal sqlstate '45000' 
        set message_text = 'solo las cuentas de credito pueden disponer';
    end if;
    
    set v_creditlimit = fn_calculate_credit_limit(v_mainid);
    -- balance = deuda actual, disponible = límite - deuda
    set v_available = v_creditlimit - v_balance;
    
    if p_amount > v_available then
        rollback;
        signal sqlstate '45000' 
        set message_text = 'credito insuficiente';
    end if;
    
    set v_newavailable = v_available - p_amount;
    
    -- SUMAR al balance porque el balance representa la DEUDA (lo que se debe)
    update caccount 
        set balance = balance + p_amount
        where accountid = p_accountid;
    
    insert into creditdisposal (accountid, amount, description, timestamp, availableafter)
        values (p_accountid, p_amount, coalesce(p_description, 'prestamo de credito'), now(), v_newavailable);
    
    set v_disposalid = last_insert_id();
    
    commit;
    
    select 
        v_disposalid as disposalid,
        v_newavailable as availableafter,
        v_creditlimit as creditlimit,
        (v_creditlimit - v_newavailable) as usedcredit,
        'disposicion realizada correctamente' as message;
        
end $$
delimiter ;
