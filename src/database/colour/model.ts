import { User } from './../user/model';
import { Guild } from './../guild/model';
import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, OneToOne, OneToMany } from 'typeorm';
import 'reflect-metadata';

@Entity()
export class Colour {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    name: string;

    @Column()
    roleID: string;

    @OneToMany(user => User, user => user.colour, {
        cascadeInsert: true,
        cascadeUpdate: true,
    })
    users: User[];

    @ManyToOne(type => Guild, guild => guild.colours)
    guild: Guild;
};
