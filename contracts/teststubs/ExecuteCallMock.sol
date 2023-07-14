// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;


contract ExecuteCallMock {
    event Success1(address, uint);
    event Success2(address, address);

    error Failed1(address, uint);
    error Failed2(address, address);


    function successCall1(address _u1, uint _d1) external  {
        emit Success1(_u1, _d1);

    }

    function successCall2(address _u1, address _u2) external  {
        emit Success2(_u1, _u2);

    }

    function failedCall1(address _u1, uint _d1) external pure {
        revert Failed1(_u1, _d1);

    }

    function failedCall2(address _u1, address _u2) external pure{
        revert Failed2(_u1, _u2);

    }
}
