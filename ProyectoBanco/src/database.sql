create database if not exists banco_jety;
use banco_jety;

-- consultas
show tables;
select * from main;
select * from customer;
select * from employee;
select * from cAccount;
select * from transfer;
select * from deposito;
select * from retiros;
select * from creditDisposal;



-- tabla principal de usuarios
create table main (
    mainId int auto_increment primary key,
    mail varchar(100) not null,
    pass varchar(100) not null,
    rol enum ('c','e','m') not null
);

-- tabla de clientes
create table customer (
    mainId int primary key,
    phoneNumber varchar(12) not null,
    firstName varchar(100) not null,
    lastNameP varchar(50) not null,
    lastNameM varchar(50) not null,
    birthday date not null,
    address varchar(250) not null,
    enterDate timestamp default current_timestamp not null,
    curp varchar(18) not null,
    rfc varchar(13),
    foreign key (mainId) references main(mainId)
        on delete cascade
        on update cascade
);

-- tabla de empleados
create table employee (
    mainId int primary key,
    phoneNumber varchar(12) not null,
    firstName varchar(100) not null,
    lastNameP varchar(50) not null,
    lastNameM varchar(50) not null,
    birthday date not null,
    address varchar(250) not null,
    enterDate timestamp default current_timestamp not null,
    curp varchar(18) not null,
    rfc varchar(13),
    nss varchar(11),
    foreign key (mainId) references main(mainId)
        on delete cascade
        on update cascade
);

-- cuentas bancarias
create table cAccount (
    accountId int auto_increment primary key,
    mainId int not null,
    cardNum varchar(16) not null,
    balance decimal(12,2) not null default 0,
    clabe varchar(18) not null,
    accNum varchar(10) not null,
    accPhone varchar(10),
    accType enum('Debito','Credito') not null,
    constraint fk_caccount_main foreign key (mainId)
        references main(mainId)
        on delete cascade on update cascade,
    unique key uq_caccount_cardnum (cardNum),
    unique key uq_caccount_clabe (clabe),
    unique key uq_caccount_accnum (accNum),
    index idx_caccount_mainid (mainId)
);

-- transferencias
create table transfer (
    tranId int auto_increment primary key,
    origin varchar(30) not null,
    banco_origen varchar(100) not null default 'Banco JETY',
    destiny varchar(30) not null,
    banco_destino varchar(100) not null default 'Banco JETY',
    ammount decimal(12,2) not null,
    fee decimal(12,2) not null,
    description varchar(300),
    doDate date
);

-- depositos
create table if not exists deposito (
    depId int auto_increment primary key,
    mainId int not null,
    accNum varchar(10) not null,
    amount decimal(12,2) not null,
    description varchar(300),
    depositDate timestamp default current_timestamp not null,
    constraint fk_deposito_main foreign key (mainId) references main(mainId),
    constraint fk_deposito_account foreign key (accNum) references cAccount(accNum)
);

-- retiros
create table if not exists retiros (
  withdrawId int auto_increment primary key,
  mainId int not null,
  accNum varchar(10) not null,
  amount decimal(12,2) not null,
  description varchar(300),
  withdrawDate timestamp default current_timestamp,
  constraint fk_retiros_main foreign key (mainId) references main(mainId)
    on delete cascade on update cascade,
  constraint fk_retiros_acc foreign key (accNum) references cAccount(accNum)
    on delete cascade on update cascade,
  index idx_retiros_mainid (mainId),
  index idx_retiros_accnum (accNum),
  index idx_retiros_date (withdrawDate)
);

-- disposicion de credito (actualizada)
drop table if exists creditdisposal;

create table creditDisposal (
    disposalId int auto_increment primary key,
    accountId int not null,
    amount decimal(12,2) not null,
    description varchar(300),
    timestamp timestamp default current_timestamp,
    availableAfter decimal(12,2),
    constraint fk_creditdisposal_account foreign key (accountId) 
        references cAccount(accountId)
        on delete cascade on update cascade,
    index idx_creditdisposal_accountid (accountId),
    index idx_creditdisposal_date (timestamp)
);

-- funciones
drop function if exists fn_calculate_credit_limit;

delimiter $$
create function fn_calculate_credit_limit(p_mainId int)
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
            date_format(depositDate, '%y-%m') as deposit_month,
            sum(amount) as monthly_total
        from deposito
        where mainId = p_mainId
          and depositDate >= date_sub(curdate(), interval 1 month)
        group by date_format(depositDate, '%y-%m')
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
  in p_description varchar(300),
  in p_banco_origen varchar(100),
  in p_banco_destino varchar(100)
)
begin
  declare v_origin_accountid int;
  declare v_dest_accountid int;
  declare v_origin_balance decimal(12,2);
  declare v_tranid int;
  declare v_fee decimal(12,2);
  declare v_not_found int default 0;
  declare v_banco_origen_final varchar(100);
  declare v_banco_destino_final varchar(100);

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

  -- Usar 'Banco JETY' por defecto si no se especifica
  set v_banco_origen_final = coalesce(p_banco_origen, 'Banco JETY');
  set v_banco_destino_final = coalesce(p_banco_destino, 'Banco JETY');

  set v_fee = (floor(p_amount / 100) * 5) + (floor(p_amount / 1500) * 10);

  start transaction;
  set v_not_found = 0;
  select accountId, balance into v_origin_accountid, v_origin_balance
  from cAccount where accNum = p_origin or clabe = p_origin for update;
    
  if v_not_found = 1 or v_origin_accountid is null then
    rollback;
    signal sqlstate '45000' set message_text = 'cuenta de origen no encontrada.';
  end if;

  set v_not_found = 0;
  select accountId into v_dest_accountid
  from cAccount where accNum = p_destiny or clabe = p_destiny for update;
    
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

  update cAccount set balance = balance - (p_amount + v_fee) where accountId = v_origin_accountid;
  update cAccount set balance = balance + p_amount where accountId = v_dest_accountid;

  insert into transfer (origin, banco_origen, destiny, banco_destino, ammount, fee, description, doDate)
  values (p_origin, v_banco_origen_final, p_destiny, v_banco_destino_final, p_amount, v_fee, p_description, curdate());

  set v_tranid = last_insert_id();
  commit;

  select v_tranid as tranId, v_fee as fee;
end$$

delimiter ;

-- procedimiento para depositos
drop procedure if exists sp_deposit_funds;

delimiter $$
create definer=`root`@`localhost` procedure sp_deposit_funds(
    in p_mainId int,
    in p_amount decimal(12,2),
    in p_description varchar(255)
)
begin
    declare v_account_id int default null;
    declare v_current_balance decimal(12,2) default 0;
    declare v_new_balance decimal(12,2);
    declare v_deposit_id int;
    declare v_accNum varchar(10);
    
    -- Manejo de errores
    declare exit handler for sqlexception
    begin
        rollback;
        signal sqlstate '45000'
        set message_text = 'Error en el deposito: No se pudo completar la operacion';
    end;

    -- Validar monto
    if p_amount is null or p_amount <= 0 then
        signal sqlstate '45000'
        set message_text = 'El monto del deposito debe ser mayor a 0';
    end if;

    start transaction;

    -- Buscar la primera cuenta del usuario
    select accountId, balance, accNum into v_account_id, v_current_balance, v_accNum
    from cAccount
    where mainId = p_mainId
    limit 1;

    -- Validar que la cuenta existe
    if v_account_id is null then
        signal sqlstate '45000'
        set message_text = 'No se encontro una cuenta para el usuario';
    end if;

    -- Calcular nuevo balance
    set v_new_balance = v_current_balance + p_amount;

    -- Actualizar el saldo de la cuenta
    update cAccount
    set balance = v_new_balance
    where accountId = v_account_id;

    -- Registrar el deposito en la tabla deposito
    insert into deposito (mainId, accNum, amount, description)
    values (p_mainId, v_accNum, p_amount, coalesce(p_description, 'Deposito en efectivo'));

    set v_deposit_id = last_insert_id();

    commit;

    -- Retornar resultado
    select 
        v_deposit_id as depId,
        0.00 as fee,
        v_new_balance as newBalance,
        v_accNum as accountNumber,
        'Deposito realizado exitosamente' as message;

end $$
delimiter ;

-- procedimiento para disposicion de credito (actualizado)
drop procedure if exists sp_dispose_credit;

delimiter $$
create procedure sp_dispose_credit(
    in p_accountId int,
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
    declare v_mainId int;
    
    declare exit handler for sqlexception
    begin
        rollback;
        resignal;
    end;
    
    if p_accountId is null or p_amount is null then
        signal sqlstate '45000' 
        set message_text = 'parametros invalidos o nulos';
    end if;
    
    if p_amount <= 0 then
        signal sqlstate '45000' 
        set message_text = 'el monto debe ser mayor a 0';
    end if;
    
    start transaction;
    
    select accType, balance, mainId 
    into v_acctype, v_balance, v_mainId
    from cAccount 
    where accountId = p_accountId
    for update;

    if v_acctype is null then
        rollback;
        signal sqlstate '45000' 
        set message_text = 'cuenta no encontrada';
    end if;
    
    if v_acctype != 'Credito' then
        rollback;
        signal sqlstate '45000' 
        set message_text = 'solo las cuentas de credito pueden disponer';
    end if;
    
    set v_creditlimit = fn_calculate_credit_limit(v_mainId);
    -- balance = deuda actual, disponible = límite - deuda
    set v_available = v_creditlimit - v_balance;
    
    if p_amount > v_available then
        rollback;
        signal sqlstate '45000' 
        set message_text = 'credito insuficiente';
    end if;
    
    set v_newavailable = v_available - p_amount;
    
    -- SUMAR al balance porque el balance representa la DEUDA (lo que se debe)
    update cAccount 
        set balance = balance + p_amount
        where accountId = p_accountId;
    
    insert into creditDisposal (accountId, amount, description, timestamp, availableAfter)
        values (p_accountId, p_amount, coalesce(p_description, 'prestamo de credito'), now(), v_newavailable);
    
    set v_disposalid = last_insert_id();
    
    commit;
    
    select 
        v_disposalid as disposalId,
        v_newavailable as availableAfter,
        v_creditlimit as creditLimit,
        (v_creditlimit - v_newavailable) as usedCredit,
        'disposicion realizada correctamente' as message;
        
end $$
delimiter ;
