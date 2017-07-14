import { User } from './../user/model';
import { Colour } from './../colour/model';
import { Entity, PrimaryColumn, OneToMany, ManyToMany, Column, JoinColumn, Index } from 'typeorm';
import 'reflect-metadata';

@Entity()
@Index('guild_id_index', (guild: Guild) => [guild.id])
export class Guild {
    @PrimaryColumn()
    @Index()
    id: string;

    @OneToMany(type => Colour, colour => colour.guild, {
        cascadeInsert: true,
        cascadeUpdate: true,
    })
    colours: Colour[];

    @ManyToMany(type => User, user => user.guilds)
    @JoinColumn()
    users: User[] = [];

    @Column('string', { nullable: true })
    channel?: string;

    @Column('string', { nullable: true })
    listmessage?: string;
}
