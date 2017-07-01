import { User } from './../user/model';
import { Colour } from './../colour/model';
import { Entity, PrimaryColumn, OneToMany, ManyToMany, Column } from 'typeorm';
import 'reflect-metadata';

@Entity()
export class Guild {
    @PrimaryColumn()
    id: string;

    @OneToMany(type => Colour, colour => colour.guild, {
        cascadeInsert: true,
        cascadeUpdate: true,
    })
    colours: Colour[];

    @OneToMany(type => User, user => user.guild)
    users: User[];

    @Column('string', { nullable: true })
    channel?: string;

    @Column('string', { nullable: true })
    listmessage?: string;
}
