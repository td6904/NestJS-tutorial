import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { AuthDto } from './dto';
import * as argon from 'argon2';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';

@Injectable()
export class AuthService {
  constructor(private prisma: PrismaService) {}

  async signup(dto: AuthDto) {
    // Generate password hash
    const hash = await argon.hash(dto.password);
    // Save the new user in the db
    try {
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        hash,
      },
    });

    delete user.hash;

    return user;
  } catch(error) {
    if (error instanceof PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
            throw new ForbiddenException('Credentials taken');
        }
    }
    throw error;
  }
}

  async signin(dto: AuthDto) {

    //Find the user by email
    const user = await this.prisma.user.findUnique({
      where: {
      email: dto.email
      },
    });
    //If user does not exist throw exception
    if (!user)
      throw new ForbiddenException(
        'Credentials incorrect'
    );
    //Compare passwords
    const pwMatches = await argon.verify(user.hash, dto.password);
    //If password incorrect, throw exception
    if (!pwMatches) 
      throw new ForbiddenException(
        'Credentials incorrect'
    );
    
    //Send back user
    delete user.hash;
    return user;
  }
}
